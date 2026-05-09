use serde::Deserialize;
use sqlx::SqlitePool;
use tauri::State;

use crate::db::chapters::{self, Chapter};
use crate::error::AppResult;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterSort {
    pub id: String,
    pub sort: i64,
}

#[tauri::command]
pub async fn list_chapters(
    pool: State<'_, SqlitePool>,
    project_id: String,
) -> AppResult<Vec<Chapter>> {
    chapters::list_by_project(pool.inner(), &project_id).await
}

#[tauri::command]
pub async fn get_chapter(pool: State<'_, SqlitePool>, id: String) -> AppResult<Chapter> {
    chapters::get_one(pool.inner(), &id).await
}

#[tauri::command]
pub async fn get_chapter_content(
    pool: State<'_, SqlitePool>,
    id: String,
) -> AppResult<String> {
    chapters::get_content(pool.inner(), &id).await
}

#[tauri::command]
pub async fn update_chapter_content(
    pool: State<'_, SqlitePool>,
    id: String,
    content_json: String,
    word_count: i64,
) -> AppResult<()> {
    chapters::update_content(pool.inner(), &id, &content_json, word_count).await
}

#[tauri::command]
pub async fn create_chapter(
    pool: State<'_, SqlitePool>,
    project_id: String,
    parent_id: Option<String>,
    title: String,
) -> AppResult<Chapter> {
    chapters::create(pool.inner(), &project_id, parent_id.as_deref(), &title).await
}

#[tauri::command]
pub async fn rename_chapter(
    pool: State<'_, SqlitePool>,
    id: String,
    title: String,
) -> AppResult<()> {
    chapters::rename(pool.inner(), &id, &title).await
}

#[tauri::command]
pub async fn set_chapter_status(
    pool: State<'_, SqlitePool>,
    id: String,
    status: String,
) -> AppResult<()> {
    chapters::set_status(pool.inner(), &id, &status).await
}

#[tauri::command]
pub async fn move_chapter(
    pool: State<'_, SqlitePool>,
    id: String,
    parent_id: Option<String>,
    sort: i64,
) -> AppResult<()> {
    chapters::move_to(pool.inner(), &id, parent_id.as_deref(), sort).await
}

#[tauri::command]
pub async fn reorder_chapters(
    pool: State<'_, SqlitePool>,
    items: Vec<ChapterSort>,
) -> AppResult<()> {
    let pairs: Vec<(String, i64)> = items.into_iter().map(|c| (c.id, c.sort)).collect();
    chapters::reorder(pool.inner(), &pairs).await
}

#[tauri::command]
pub async fn delete_chapter(pool: State<'_, SqlitePool>, id: String) -> AppResult<()> {
    chapters::delete(pool.inner(), &id).await
}
