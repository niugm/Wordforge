use sqlx::SqlitePool;
use tauri::State;

use crate::db::sessions::{self, DailyWords, WritingSession, WritingStats};
use crate::error::AppResult;

#[tauri::command]
pub async fn start_session(
    pool: State<'_, SqlitePool>,
    project_id: String,
) -> AppResult<WritingSession> {
    sessions::start(pool.inner(), &project_id).await
}

#[tauri::command]
pub async fn end_session(
    pool: State<'_, SqlitePool>,
    id: String,
    words_written: i64,
) -> AppResult<()> {
    sessions::end(pool.inner(), &id, words_written).await
}

#[tauri::command]
pub async fn get_writing_stats(
    pool: State<'_, SqlitePool>,
    project_id: String,
) -> AppResult<WritingStats> {
    sessions::get_stats(pool.inner(), &project_id).await
}

#[tauri::command]
pub async fn get_daily_words(
    pool: State<'_, SqlitePool>,
    project_id: String,
    days: i64,
) -> AppResult<Vec<DailyWords>> {
    sessions::get_daily_words(pool.inner(), &project_id, days).await
}
