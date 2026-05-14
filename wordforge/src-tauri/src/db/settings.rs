use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::db::now_ms;
use crate::error::{AppError, AppResult};

const BACKUP_DIR_KEY: &str = "backup.dir";
const BACKUP_ENABLED_KEY: &str = "backup.enabled";

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
