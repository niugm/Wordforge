use serde::Deserialize;
use sqlx::SqlitePool;
use tauri::State;

use crate::db::outlines::{self, OutlineInput, OutlineNode};
use crate::error::AppResult;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlineSort {
    pub id: String,
    pub sort: i64,
}

#[tauri::command]
pub async fn list_outlines(
    pool: State<'_, SqlitePool>,
    project_id: String,
) -> AppResult<Vec<OutlineNode>> {
    outlines::list_by_project(pool.inner(), &project_id).await
}

#[tauri::command]
pub async fn create_outline(
    pool: State<'_, SqlitePool>,
    project_id: String,
    parent_id: Option<String>,
    input: OutlineInput,
) -> AppResult<OutlineNode> {
    outlines::create(pool.inner(), &project_id, parent_id.as_deref(), &input).await
}

#[tauri::command]
pub async fn update_outline(
    pool: State<'_, SqlitePool>,
    id: String,
    input: OutlineInput,
) -> AppResult<()> {
    outlines::update(pool.inner(), &id, &input).await
}

#[tauri::command]
pub async fn move_outline(
    pool: State<'_, SqlitePool>,
    id: String,
    parent_id: Option<String>,
    sort: i64,
) -> AppResult<()> {
    outlines::move_to(pool.inner(), &id, parent_id.as_deref(), sort).await
}

#[tauri::command]
pub async fn reorder_outlines(
    pool: State<'_, SqlitePool>,
    items: Vec<OutlineSort>,
) -> AppResult<()> {
    let pairs: Vec<(String, i64)> = items.into_iter().map(|item| (item.id, item.sort)).collect();
    outlines::reorder(pool.inner(), &pairs).await
}

#[tauri::command]
pub async fn delete_outline(pool: State<'_, SqlitePool>, id: String) -> AppResult<()> {
    outlines::delete(pool.inner(), &id).await
}
