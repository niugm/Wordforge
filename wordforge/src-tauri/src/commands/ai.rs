use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::{Emitter, State, Window};
use ulid::Ulid;

use crate::ai::cancel::AiStreamCancels;
use crate::ai::{self, AiPolishResult, LlmConfig, PolishKind};
use crate::db::now_ms;
use crate::db::settings;
use crate::error::{AppError, AppResult};

#[tauri::command]
pub async fn ai_polish(
    pool: State<'_, SqlitePool>,
    provider: String,
    kind: PolishKind,
    text: String,
    instruction: Option<String>,
    project_id: Option<String>,
) -> AppResult<AiPolishResult> {
    let (credential, api_key) =
        settings::load_ai_credential_with_secret(pool.inner(), provider).await?;
    let result = ai::polish_text(
        LlmConfig {
            provider: credential.provider,
            api_key,
            base_url: credential.base_url,
            model: credential.model,
        },
        kind,
        text,
        instruction,
    )
    .await?;

    if let Some(project_id) = project_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        save_polish_messages(pool.inner(), &project_id, &result).await?;
    }

    Ok(result)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiPolishStreamDelta {
    request_id: String,
    delta: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPolishStreamInput {
    request_id: String,
    provider: String,
    kind: PolishKind,
    text: String,
    instruction: Option<String>,
    project_id: Option<String>,
    continue_from: Option<String>,
}

#[tauri::command]
pub async fn ai_polish_stream(
    window: Window,
    pool: State<'_, SqlitePool>,
    cancels: State<'_, AiStreamCancels>,
    input: AiPolishStreamInput,
) -> AppResult<AiPolishResult> {
    let request_id = input.request_id.trim().to_string();
    if request_id.is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "requestId is required".into(),
        ));
    }
    cancels.clear(&request_id)?;

    let (credential, api_key) =
        settings::load_ai_credential_with_secret(pool.inner(), input.provider).await?;
    let emit_window = window.clone();
    let emit_request_id = request_id.clone();
    let cancel_request_id = request_id.clone();
    let cancel_state = cancels.inner().clone();
    let result = ai::polish_text_stream(
        LlmConfig {
            provider: credential.provider,
            api_key,
            base_url: credential.base_url,
            model: credential.model,
        },
        input.kind,
        input.text,
        build_stream_instruction(input.instruction, input.continue_from.as_deref()),
        Box::new(move |delta| {
            emit_window.emit(
                "ai-polish-stream-delta",
                AiPolishStreamDelta {
                    request_id: emit_request_id.clone(),
                    delta,
                },
            )?;
            Ok(())
        }),
        Box::new(move || cancel_state.is_cancelled(&cancel_request_id)),
    )
    .await;
    let was_cancelled = cancels.is_cancelled(&request_id)?;
    cancels.clear(&request_id)?;
    if was_cancelled {
        return Err(AppError::InvalidInput("ai stream cancelled".into()));
    }
    let result = result?;

    if let Some(project_id) = input
        .project_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        save_polish_messages(pool.inner(), &project_id, &result).await?;
    }

    Ok(result)
}

#[tauri::command]
pub fn cancel_ai_polish_stream(
    cancels: State<'_, AiStreamCancels>,
    request_id: String,
) -> AppResult<()> {
    let request_id = request_id.trim().to_string();
    if request_id.is_empty() {
        return Err(AppError::InvalidInput("requestId is required".into()));
    }
    cancels.cancel(request_id)
}

fn build_stream_instruction(
    instruction: Option<String>,
    continue_from: Option<&str>,
) -> Option<String> {
    let base = instruction
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let partial = continue_from
        .map(str::trim)
        .filter(|value| !value.is_empty());

    match (base, partial) {
        (Some(base), Some(partial)) => Some(format!(
            "{base}\n\n这是上一次已经生成的开头，请继续完成同一版改写；输出时必须包含完整结果，不要解释：\n{partial}"
        )),
        (None, Some(partial)) => Some(format!(
            "请继续完成同一版改写。下面是上一次已经生成的开头；输出时必须包含完整结果，不要解释：\n{partial}"
        )),
        (Some(base), None) => Some(base.to_string()),
        (None, None) => None,
    }
}

async fn save_polish_messages(
    pool: &SqlitePool,
    project_id: &str,
    result: &AiPolishResult,
) -> AppResult<()> {
    let now = now_ms();
    let mut tx = pool.begin().await?;
    sqlx::query(
        "INSERT INTO ai_messages (id, project_id, scope, role, content, tokens, created_at)
         VALUES (?, ?, 'polish', 'user', ?, NULL, ?)",
    )
    .bind(Ulid::new().to_string())
    .bind(project_id)
    .bind(&result.original_text)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO ai_messages (id, project_id, scope, role, content, tokens, created_at)
         VALUES (?, ?, 'polish', 'assistant', ?, NULL, ?)",
    )
    .bind(Ulid::new().to_string())
    .bind(project_id)
    .bind(&result.result_text)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}
