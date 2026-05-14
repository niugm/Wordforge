use sqlx::SqlitePool;
use tauri::State;
use ulid::Ulid;

use crate::ai::{self, AiPolishResult, LlmConfig, PolishKind};
use crate::db::now_ms;
use crate::db::settings;
use crate::error::AppResult;

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
