use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::db::now_ms;
use crate::error::{AppError, AppResult};

const BACKUP_DIR_KEY: &str = "backup.dir";
const BACKUP_ENABLED_KEY: &str = "backup.enabled";
const AI_PROVIDERS: [&str; 3] = ["openai", "anthropic", "gemini"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSettings {
    pub backup_dir: Option<String>,
    pub auto_backup_enabled: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCredentialSettings {
    pub provider: String,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub has_api_key: bool,
}

#[derive(Debug, sqlx::FromRow)]
struct StoredAiCredential {
    provider: String,
    base_url: Option<String>,
    model: Option<String>,
    has_api_key: i64,
}

pub async fn get_backup_settings(pool: &SqlitePool) -> AppResult<BackupSettings> {
    let backup_dir = get_setting(pool, BACKUP_DIR_KEY).await?;
    let auto_backup_enabled = get_setting(pool, BACKUP_ENABLED_KEY)
        .await?
        .is_some_and(|value| value == "true");

    Ok(BackupSettings {
        backup_dir,
        auto_backup_enabled,
    })
}

pub async fn update_backup_settings(
    pool: &SqlitePool,
    backup_dir: Option<String>,
    auto_backup_enabled: bool,
) -> AppResult<BackupSettings> {
    let backup_dir = backup_dir
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    if let Some(dir) = &backup_dir {
        std::fs::create_dir_all(dir)?;
    }

    set_setting(pool, BACKUP_DIR_KEY, backup_dir.as_deref()).await?;
    set_setting(
        pool,
        BACKUP_ENABLED_KEY,
        Some(if auto_backup_enabled { "true" } else { "false" }),
    )
    .await?;

    get_backup_settings(pool).await
}

pub async fn backup_now(
    pool: &SqlitePool,
    app_data_dir: &Path,
    backup_dir: Option<String>,
) -> AppResult<BackupResult> {
    let configured = get_backup_settings(pool).await?.backup_dir;
    let target_dir = backup_dir
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or(configured)
        .ok_or_else(|| AppError::InvalidInput("backup directory is required".into()))?;

    std::fs::create_dir_all(&target_dir)?;

    let source = app_data_dir.join("wordforge").join("wordforge.db");
    if !source.exists() {
        return Err(AppError::NotFound(format!("database {}", source.display())));
    }

    let target = PathBuf::from(target_dir).join(format!("wordforge-{}.db", now_ms()));
    std::fs::copy(&source, &target)?;

    Ok(BackupResult {
        path: target.to_string_lossy().to_string(),
    })
}

pub async fn list_ai_credentials(pool: &SqlitePool) -> AppResult<Vec<AiCredentialSettings>> {
    let rows = sqlx::query_as::<_, StoredAiCredential>(
        "SELECT provider, base_url, model, length(ciphertext) > 0 AS has_api_key
         FROM ai_credentials",
    )
    .fetch_all(pool)
    .await?;

    let settings = AI_PROVIDERS
        .iter()
        .map(|provider| {
            rows.iter()
                .find(|row| row.provider == *provider)
                .map(|row| AiCredentialSettings {
                    provider: row.provider.clone(),
                    base_url: row.base_url.clone(),
                    model: row.model.clone(),
                    has_api_key: row.has_api_key != 0,
                })
                .unwrap_or_else(|| AiCredentialSettings {
                    provider: (*provider).to_string(),
                    base_url: None,
                    model: None,
                    has_api_key: false,
                })
        })
        .collect();

    Ok(settings)
}

pub async fn save_ai_credential(
    pool: &SqlitePool,
    provider: String,
    api_key: Option<String>,
    base_url: Option<String>,
    model: Option<String>,
) -> AppResult<AiCredentialSettings> {
    let provider = normalize_provider(provider)?;
    let api_key = trim_optional(api_key);
    let base_url = trim_optional(base_url);
    let model = trim_optional(model);

    match api_key {
        Some(api_key) => {
            sqlx::query(
                "INSERT INTO ai_credentials (provider, ciphertext, nonce, base_url, model)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(provider) DO UPDATE SET
                   ciphertext = excluded.ciphertext,
                   nonce = excluded.nonce,
                   base_url = excluded.base_url,
                   model = excluded.model",
            )
            .bind(&provider)
            .bind(api_key.into_bytes())
            .bind(Vec::<u8>::new())
            .bind(&base_url)
            .bind(&model)
            .execute(pool)
            .await?;
        }
        None => {
            let result = sqlx::query(
                "UPDATE ai_credentials
                 SET base_url = ?, model = ?
                 WHERE provider = ?",
            )
            .bind(&base_url)
            .bind(&model)
            .bind(&provider)
            .execute(pool)
            .await?;

            if result.rows_affected() == 0 {
                return Err(AppError::InvalidInput("api key is required".into()));
            }
        }
    }

    get_ai_credential(pool, &provider).await
}

pub async fn delete_ai_credential(pool: &SqlitePool, provider: String) -> AppResult<()> {
    let provider = normalize_provider(provider)?;
    sqlx::query("DELETE FROM ai_credentials WHERE provider = ?")
        .bind(provider)
        .execute(pool)
        .await?;
    Ok(())
}

async fn get_ai_credential(pool: &SqlitePool, provider: &str) -> AppResult<AiCredentialSettings> {
    let row = sqlx::query_as::<_, StoredAiCredential>(
        "SELECT provider, base_url, model, length(ciphertext) > 0 AS has_api_key
         FROM ai_credentials
         WHERE provider = ?",
    )
    .bind(provider)
    .fetch_optional(pool)
    .await?;

    Ok(row
        .map(|row| AiCredentialSettings {
            provider: row.provider,
            base_url: row.base_url,
            model: row.model,
            has_api_key: row.has_api_key != 0,
        })
        .unwrap_or_else(|| AiCredentialSettings {
            provider: provider.to_string(),
            base_url: None,
            model: None,
            has_api_key: false,
        }))
}

async fn get_setting(pool: &SqlitePool, key: &str) -> AppResult<Option<String>> {
    let value = sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await?;
    Ok(value)
}

async fn set_setting(pool: &SqlitePool, key: &str, value: Option<&str>) -> AppResult<()> {
    match value {
        Some(value) => {
            sqlx::query(
                "INSERT INTO settings (key, value) VALUES (?, ?)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            )
            .bind(key)
            .bind(value)
            .execute(pool)
            .await?;
        }
        None => {
            sqlx::query("DELETE FROM settings WHERE key = ?")
                .bind(key)
                .execute(pool)
                .await?;
        }
    }
    Ok(())
}

fn normalize_provider(provider: String) -> AppResult<String> {
    let provider = provider.trim().to_ascii_lowercase();
    if AI_PROVIDERS.contains(&provider.as_str()) {
        Ok(provider)
    } else {
        Err(AppError::InvalidInput(format!(
            "unsupported ai provider: {provider}"
        )))
    }
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}
