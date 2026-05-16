use futures_util::StreamExt;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};

use crate::ai::{ChatRequest, LlmConfig, LlmProvider, StreamCancelCheck, StreamDeltaHandler};
use crate::error::{AppError, AppResult};

const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";
const DEFAULT_MODEL: &str = "gpt-4.1-mini";

pub struct OpenAiCompatibleProvider {
    client: reqwest::Client,
    api_key: String,
    endpoint: String,
    model: String,
}

impl OpenAiCompatibleProvider {
    pub fn new(config: LlmConfig) -> AppResult<Self> {
        let base_url = config
            .base_url
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(DEFAULT_BASE_URL)
            .trim_end_matches('/');
        let model = config
            .model
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| DEFAULT_MODEL.to_string());

        Ok(Self {
            client: reqwest::Client::new(),
            api_key: config.api_key,
            endpoint: format!("{base_url}/chat/completions"),
            model,
        })
    }
}

#[async_trait::async_trait]
impl LlmProvider for OpenAiCompatibleProvider {
    async fn complete(&self, request: ChatRequest) -> AppResult<String> {
        let body = self.chat_body(request, false);

        let response = self
            .client
            .post(&self.endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .header(CONTENT_TYPE, "application/json")
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        let text = response.text().await?;
        if !status.is_success() {
            return Err(AppError::InvalidInput(format!(
                "ai request failed with status {status}: {}",
                trim_error_body(&text)
            )));
        }

        let parsed: ChatCompletionResponse = serde_json::from_str(&text).map_err(|error| {
            AppError::InvalidInput(format!("failed to parse ai response: {error}"))
        })?;

        parsed
            .choices
            .into_iter()
            .next()
            .map(|choice| choice.message.content)
            .ok_or_else(|| AppError::InvalidInput("ai response has no choices".into()))
    }

    async fn complete_stream(
        &self,
        request: ChatRequest,
        mut on_delta: StreamDeltaHandler,
        is_cancelled: StreamCancelCheck,
    ) -> AppResult<String> {
        let body = self.chat_body(request, true);
        let response = self
            .client
            .post(&self.endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .header(CONTENT_TYPE, "application/json")
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let text = response.text().await?;
            return Err(AppError::InvalidInput(format!(
                "ai stream request failed with status {status}: {}",
                trim_error_body(&text)
            )));
        }

        let mut output = String::new();
        let mut pending = String::new();
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            if is_cancelled()? {
                break;
            }
            let chunk = chunk?;
            let chunk_text = String::from_utf8_lossy(&chunk);
            pending.push_str(&chunk_text);

            while let Some((frame, rest)) = take_sse_frame(&pending) {
                pending = rest;
                for data in frame
                    .lines()
                    .filter_map(|line| line.strip_prefix("data:").map(str::trim))
                {
                    if data == "[DONE]" {
                        return Ok(output);
                    }
                    if is_cancelled()? {
                        return Ok(output);
                    }
                    let delta = parse_stream_delta(data)?;
                    if delta.is_empty() {
                        continue;
                    }
                    output.push_str(&delta);
                    on_delta(delta)?;
                }
            }
        }

        Ok(output)
    }

    fn provider_name(&self) -> &'static str {
        "openai"
    }

    fn model_name(&self) -> &str {
        &self.model
    }
}

impl OpenAiCompatibleProvider {
    fn chat_body(&self, request: ChatRequest, stream: bool) -> ChatCompletionRequest {
        ChatCompletionRequest {
            model: self.model.clone(),
            messages: vec![
                ChatMessage {
                    role: "system",
                    content: request.system_prompt,
                },
                ChatMessage {
                    role: "user",
                    content: request.user_prompt,
                },
            ],
            temperature: 0.7,
            stream,
        }
    }
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: &'static str,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatChoiceMessage,
}

#[derive(Debug, Deserialize)]
struct ChatChoiceMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionStreamResponse {
    choices: Vec<ChatStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatStreamChoice {
    delta: ChatStreamDelta,
}

#[derive(Debug, Deserialize)]
struct ChatStreamDelta {
    content: Option<String>,
}

fn take_sse_frame(input: &str) -> Option<(String, String)> {
    if let Some(index) = input.find("\n\n") {
        return Some((input[..index].to_string(), input[index + 2..].to_string()));
    }
    if let Some(index) = input.find("\r\n\r\n") {
        return Some((input[..index].to_string(), input[index + 4..].to_string()));
    }
    None
}

fn parse_stream_delta(data: &str) -> AppResult<String> {
    let parsed: ChatCompletionStreamResponse = serde_json::from_str(data)
        .map_err(|error| AppError::InvalidInput(format!("failed to parse ai stream: {error}")))?;
    Ok(parsed
        .choices
        .into_iter()
        .filter_map(|choice| choice.delta.content)
        .collect())
}

fn trim_error_body(body: &str) -> String {
    let compact = body.trim().replace(['\r', '\n'], " ");
    compact.chars().take(500).collect()
}
