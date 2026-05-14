use sqlx::SqlitePool;
use tauri::State;

use crate::db::search::{self, ChapterSearchResult};
use crate::error::AppResult;

#[tauri::command]
pub async fn search_chapter_body(
    pool: State<'_, SqlitePool>,
    project_id: String,
    query: String,
    limit: Option<i64>,
) -> AppResult<Vec<ChapterSearchResult>> {
    search::search_chapter_body(pool.inner(), &project_id, &query, limit.unwrap_or(20)).await
}
