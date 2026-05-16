pub mod cancel;
mod openai;
mod prompts;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

pub const MAX_POLISH_TEXT_CHARS: usize = 5000;
pub const MAX_REVIEW_TEXT_CHARS: usize = 50_000;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PolishKind {
    Condense,
    Expand,
    Describe,
    Tone,
    Free,
}

#[derive(Debug, Clone)]
pub struct LlmConfig {
    pub provider: String,
    pub api_key: String,
    pub base_url: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ChatRequest {
    pub system_prompt: String,
    pub user_prompt: String,
}

#[derive(Debug, Clone)]
pub struct AiPolishStreamStart {
    pub provider: String,
    pub model: String,
    pub kind: String,
    pub original_text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPolishResult {
    pub provider: String,
    pub model: String,
    pub kind: String,
    pub original_text: String,
    pub result_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChapterReviewIssue {
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub severity: String,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub quote: String,
    #[serde(default)]
    pub problem: String,
    #[serde(default)]
    pub suggestion: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChapterReviewResult {
    pub provider: String,
    pub model: String,
    pub chapter_title: String,
    pub issues: Vec<AiChapterReviewIssue>,
}

#[derive(Debug, Deserialize)]
struct RawChapterReviewResult {
    #[serde(default)]
    issues: Vec<AiChapterReviewIssue>,
}

pub type StreamDeltaHandler = Box<dyn FnMut(String) -> AppResult<()> + Send>;
pub type StreamCancelCheck = Box<dyn Fn() -> AppResult<bool> + Send + Sync>;

#[async_trait]
trait LlmProvider {
    async fn complete(&self, request: ChatRequest) -> AppResult<String>;
    async fn complete_stream(
        &self,
        request: ChatRequest,
        on_delta: StreamDeltaHandler,
        is_cancelled: StreamCancelCheck,
    ) -> AppResult<String>;
    fn provider_name(&self) -> &'static str;
    fn model_name(&self) -> &str;
}

pub async fn polish_text(
    config: LlmConfig,
    kind: PolishKind,
    text: String,
    instruction: Option<String>,
) -> AppResult<AiPolishResult> {
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err(AppError::InvalidInput("polish text is required".into()));
    }
    if text.chars().count() > MAX_POLISH_TEXT_CHARS {
        return Err(AppError::InvalidInput(
            "selected text is too long; please polish it in smaller sections".into(),
        ));
    }

    let provider = provider_for(config)?;
    let request = prompts::polish_request(kind, &text, instruction.as_deref());
    let result_text = provider.complete(request).await?.trim().to_string();
    if result_text.is_empty() {
        return Err(AppError::InvalidInput("ai returned empty content".into()));
    }

    Ok(AiPolishResult {
        provider: provider.provider_name().to_string(),
        model: provider.model_name().to_string(),
        kind: polish_kind_code(kind).to_string(),
        original_text: text,
        result_text,
    })
}

pub async fn polish_text_stream(
    config: LlmConfig,
    kind: PolishKind,
    text: String,
    instruction: Option<String>,
    on_delta: StreamDeltaHandler,
    is_cancelled: StreamCancelCheck,
) -> AppResult<AiPolishResult> {
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err(AppError::InvalidInput("polish text is required".into()));
    }
    if text.chars().count() > MAX_POLISH_TEXT_CHARS {
        return Err(AppError::InvalidInput(
            "selected text is too long; please polish it in smaller sections".into(),
        ));
    }

    let provider = provider_for(config)?;
    let start = AiPolishStreamStart {
        provider: provider.provider_name().to_string(),
        model: provider.model_name().to_string(),
        kind: polish_kind_code(kind).to_string(),
        original_text: text.clone(),
    };
    let request = prompts::polish_request(kind, &text, instruction.as_deref());
    let result_text = provider
        .complete_stream(request, on_delta, is_cancelled)
        .await?
        .trim()
        .to_string();
    if result_text.is_empty() {
        return Err(AppError::InvalidInput("ai returned empty content".into()));
    }

    Ok(AiPolishResult {
        provider: start.provider,
        model: start.model,
        kind: start.kind,
        original_text: start.original_text,
        result_text,
    })
}

pub async fn review_chapter(
    config: LlmConfig,
    chapter_title: String,
    text: String,
) -> AppResult<AiChapterReviewResult> {
    let chapter_title = chapter_title.trim().to_string();
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err(AppError::InvalidInput("chapter text is required".into()));
    }
    if text.chars().count() > MAX_REVIEW_TEXT_CHARS {
        return Err(AppError::InvalidInput(
            "chapter is too long; please review a smaller section for now".into(),
        ));
    }

    let provider = provider_for(config)?;
    let request = prompts::chapter_review_request(&chapter_title, &text);
    let raw = provider.complete(request).await?.trim().to_string();
    if raw.is_empty() {
        return Err(AppError::InvalidInput("ai returned empty review".into()));
    }
    let parsed = parse_review_result(&raw)?;

    Ok(AiChapterReviewResult {
        provider: provider.provider_name().to_string(),
        model: provider.model_name().to_string(),
        chapter_title,
        issues: parsed
            .issues
            .into_iter()
            .filter_map(normalize_review_issue)
            .take(8)
            .collect(),
    })
}

fn provider_for(config: LlmConfig) -> AppResult<Box<dyn LlmProvider + Send + Sync>> {
    match config.provider.as_str() {
        "openai" => Ok(Box::new(openai::OpenAiCompatibleProvider::new(config)?)),
        "anthropic" | "gemini" => Err(AppError::InvalidInput(format!(
            "{} provider is not available yet; use OpenAI-compatible settings for now",
            config.provider
        ))),
        _ => Err(AppError::InvalidInput(format!(
            "unsupported ai provider: {}",
            config.provider
        ))),
    }
}

fn polish_kind_code(kind: PolishKind) -> &'static str {
    match kind {
        PolishKind::Condense => "condense",
        PolishKind::Expand => "expand",
        PolishKind::Describe => "describe",
        PolishKind::Tone => "tone",
        PolishKind::Free => "free",
    }
}

fn parse_review_result(raw: &str) -> AppResult<RawChapterReviewResult> {
    let trimmed = raw.trim();
    if let Ok(parsed) = serde_json::from_str::<RawChapterReviewResult>(trimmed) {
        return Ok(parsed);
    }

    let Some(start) = trimmed.find('{') else {
        return Err(AppError::InvalidInput(
            "ai review was not valid JSON".into(),
        ));
    };
    let Some(end) = trimmed.rfind('}') else {
        return Err(AppError::InvalidInput(
            "ai review was not valid JSON".into(),
        ));
    };
    serde_json::from_str::<RawChapterReviewResult>(&trimmed[start..=end])
        .map_err(|error| AppError::InvalidInput(format!("failed to parse ai review: {error}")))
}

fn normalize_review_issue(mut issue: AiChapterReviewIssue) -> Option<AiChapterReviewIssue> {
    issue.category = match issue.category.trim() {
        "logic" | "逻辑" => "logic",
        "continuity" | "连贯" | "连贯性" => "continuity",
        "voice" | "人物口吻" | "口吻" => "voice",
        "foreshadowing" | "伏笔" | "设定" => "foreshadowing",
        _ => "continuity",
    }
    .to_string();
    issue.severity = match issue.severity.trim() {
        "high" | "高" | "严重" => "high",
        "medium" | "中" | "一般" => "medium",
        "low" | "低" | "轻微" => "low",
        _ => "medium",
    }
    .to_string();
    issue.location = issue.location.trim().to_string();
    issue.quote = issue.quote.trim().to_string();
    issue.problem = issue.problem.trim().to_string();
    issue.suggestion = issue.suggestion.trim().to_string();

    if issue.problem.is_empty() && issue.suggestion.is_empty() {
        None
    } else {
        Some(issue)
    }
}
