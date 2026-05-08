use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use ulid::Ulid;

use crate::db::now_ms;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub cover_path: Option<String>,
    pub target_word_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub archived: i64,
}

pub async fn list(pool: &SqlitePool) -> AppResult<Vec<Project>> {
    let rows = sqlx::query_as::<_, Project>(
        "SELECT id, name, description, cover_path, target_word_count, created_at, updated_at, archived
         FROM projects
         ORDER BY archived ASC, updated_at DESC",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn create(
    pool: &SqlitePool,
    name: &str,
    description: Option<&str>,
) -> AppResult<Project> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput("name must not be empty".into()));
    }

    let id = Ulid::new().to_string();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO projects (id, name, description, target_word_count, created_at, updated_at, archived)
         VALUES (?, ?, ?, 0, ?, ?, 0)",
    )
    .bind(&id)
    .bind(trimmed)
    .bind(description)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(Project {
        id,
        name: trimmed.to_string(),
        description: description.map(str::to_string),
        cover_path: None,
        target_word_count: 0,
        created_at: now,
        updated_at: now,
        archived: 0,
    })
}

pub async fn rename(pool: &SqlitePool, id: &str, name: &str) -> AppResult<()> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput("name must not be empty".into()));
    }

    let result = sqlx::query("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?")
        .bind(trimmed)
        .bind(now_ms())
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
    Ok(())
}

pub async fn set_archived(pool: &SqlitePool, id: &str, archived: bool) -> AppResult<()> {
    let result = sqlx::query("UPDATE projects SET archived = ?, updated_at = ? WHERE id = ?")
        .bind(if archived { 1 } else { 0 })
        .bind(now_ms())
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
    Ok(())
}

pub async fn delete(pool: &SqlitePool, id: &str) -> AppResult<()> {
    let result = sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
    Ok(())
}
