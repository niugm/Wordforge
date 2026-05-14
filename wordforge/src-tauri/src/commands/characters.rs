use sqlx::SqlitePool;
use tauri::State;

use crate::db::characters::{self, Character, CharacterInput};
use crate::error::AppResult;

#[tauri::command]
pub async fn list_characters(
    pool: State<'_, SqlitePool>,
    project_id: String,
) -> AppResult<Vec<Character>> {
    characters::list_by_project(pool.inner(), &project_id).await
}

#[tauri::command]
pub async fn create_character(
    pool: State<'_, SqlitePool>,
    project_id: String,
    input: CharacterInput,
) -> AppResult<Character> {
    characters::create(pool.inner(), &project_id, &input).await
}

#[tauri::command]
pub async fn update_character(
    pool: State<'_, SqlitePool>,
    id: String,
    input: CharacterInput,
) -> AppResult<()> {
    characters::update(pool.inner(), &id, &input).await
}

#[tauri::command]
pub async fn delete_character(pool: State<'_, SqlitePool>, id: String) -> AppResult<()> {
    characters::delete(pool.inner(), &id).await
}
