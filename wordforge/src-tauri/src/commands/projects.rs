use sqlx::SqlitePool;
use tauri::State;

use crate::db::projects::{self, Project};
use crate::error::AppResult;

#[tauri::command]
pub async fn list_projects(pool: State<'_, SqlitePool>) -> AppResult<Vec<Project>> {
    projects::list(pool.inner()).await
}

#[tauri::command]
pub async fn create_project(
    pool: State<'_, SqlitePool>,
    name: String,
    description: Option<String>,
) -> AppResult<Project> {
    projects::create(pool.inner(), &name, description.as_deref()).await
}

#[tauri::command]
pub async fn rename_project(
    pool: State<'_, SqlitePool>,
    id: String,
    name: String,
) -> AppResult<()> {
    projects::rename(pool.inner(), &id, &name).await
}

#[tauri::command]
pub async fn archive_project(
    pool: State<'_, SqlitePool>,
    id: String,
    archived: bool,
) -> AppResult<()> {
    projects::set_archived(pool.inner(), &id, archived).await
}

#[tauri::command]
pub async fn delete_project(pool: State<'_, SqlitePool>, id: String) -> AppResult<()> {
    projects::delete(pool.inner(), &id).await
}
