use std::path::PathBuf;

use sqlx::SqlitePool;
use tauri::State;

use crate::db::settings::{self, AiCredentialSettings, BackupResult, BackupSettings};
use crate::error::AppResult;

#[tauri::command]
pub async fn get_backup_settings(pool: State<'_, SqlitePool>) -> AppResult<BackupSettings> {
    settings::get_backup_settings(pool.inner()).await
}

#[tauri::command]
pub async fn update_backup_settings(
    pool: State<'_, SqlitePool>,
    backup_dir: Option<String>,
    auto_backup_enabled: bool,
) -> AppResult<BackupSettings> {
    settings::update_backup_settings(pool.inner(), backup_dir, auto_backup_enabled).await
}

#[tauri::command]
pub async fn backup_now(
    pool: State<'_, SqlitePool>,
    app_data_dir: State<'_, PathBuf>,
    backup_dir: Option<String>,
) -> AppResult<BackupResult> {
    settings::backup_now(pool.inner(), app_data_dir.inner(), backup_dir).await
}

#[tauri::command]
pub async fn list_ai_credentials(
    pool: State<'_, SqlitePool>,
) -> AppResult<Vec<AiCredentialSettings>> {
    settings::list_ai_credentials(pool.inner()).await
}

#[tauri::command]
pub async fn save_ai_credential(
    pool: State<'_, SqlitePool>,
    provider: String,
    api_key: Option<String>,
    base_url: Option<String>,
    model: Option<String>,
) -> AppResult<AiCredentialSettings> {
    settings::save_ai_credential(pool.inner(), provider, api_key, base_url, model).await
}

#[tauri::command]
pub async fn delete_ai_credential(pool: State<'_, SqlitePool>, provider: String) -> AppResult<()> {
    settings::delete_ai_credential(pool.inner(), provider).await
}
