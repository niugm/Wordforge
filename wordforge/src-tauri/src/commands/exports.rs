use std::path::PathBuf;

use sqlx::SqlitePool;
use tauri::State;

use crate::db::exports::{self, ExportResult};
use crate::error::AppResult;

#[tauri::command]
pub async fn export_project(
    pool: State<'_, SqlitePool>,
    app_data_dir: State<'_, PathBuf>,
    project_id: String,
    format: String,
    mode: String,
) -> AppResult<ExportResult> {
    exports::export_project(pool.inner(), app_data_dir.inner(), project_id, format, mode).await
}

#[tauri::command]
pub async fn export_chapter(
    pool: State<'_, SqlitePool>,
    app_data_dir: State<'_, PathBuf>,
    chapter_id: String,
    format: String,
) -> AppResult<ExportResult> {
    exports::export_chapter(pool.inner(), app_data_dir.inner(), chapter_id, format).await
}
