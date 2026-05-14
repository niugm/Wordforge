mod openai;
mod prompts;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

pub const MAX_POLISH_TEXT_CHARS: usize = 5000;

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPolishResult {
    pub provider: String,
    pub model: String,
    pub kind: String,
    pub original_text: String,
    pub result_text: String,
}

#[async_trait]
trait LlmProvider {
    async fn complete(&self, request: ChatRequest) -> AppResult<String>;
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
