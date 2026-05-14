use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use ulid::Ulid;

use crate::db::now_ms;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Chapter {
    pub id: String,
    pub project_id: String,
    pub parent_id: Option<String>,
    pub sort: i64,
    pub title: String,
    pub summary: Option<String>,
    pub word_count: i64,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

const VALID_STATUS: &[&str] = &["draft", "revising", "done"];

fn validate_status(status: &str) -> AppResult<()> {
    if VALID_STATUS.contains(&status) {
        Ok(())
    } else {
        Err(AppError::InvalidInput(format!(
            "status must be one of {VALID_STATUS:?}, got {status}"
        )))
    }
}

pub async fn get_one(pool: &SqlitePool, id: &str) -> AppResult<Chapter> {
    let row = sqlx::query_as::<_, Chapter>(
        "SELECT id, project_id, parent_id, sort, title, summary,
                word_count, status, created_at, updated_at
         FROM chapters
         WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    row.ok_or_else(|| AppError::NotFound(format!("chapter {id}")))
}

pub async fn get_content(pool: &SqlitePool, id: &str) -> AppResult<String> {
    let content: Option<String> =
        sqlx::query_scalar("SELECT content_json FROM chapters WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;
    content.ok_or_else(|| AppError::NotFound(format!("chapter {id}")))
}

pub async fn update_content(
    pool: &SqlitePool,
    id: &str,
    content_json: &str,
    word_count: i64,
) -> AppResult<()> {
    let result = sqlx::query(
        "UPDATE chapters
         SET content_json = ?, word_count = ?, updated_at = ?
         WHERE id = ?",
    )
    .bind(content_json)
    .bind(word_count)
    .bind(now_ms())
    .bind(id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("chapter {id}")));
    }
    Ok(())
}

pub async fn list_by_project(pool: &SqlitePool, project_id: &str) -> AppResult<Vec<Chapter>> {
    let rows = sqlx::query_as::<_, Chapter>(
        "SELECT id, project_id, parent_id, sort, title, summary,
                word_count, status, created_at, updated_at
         FROM chapters
         WHERE project_id = ?
         ORDER BY COALESCE(parent_id, ''), sort, created_at",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn create(
    pool: &SqlitePool,
    project_id: &str,
    parent_id: Option<&str>,
    title: &str,
) -> AppResult<Chapter> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput("title must not be empty".into()));
    }

    let next_sort: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort), -1) + 1 FROM chapters
         WHERE project_id = ? AND parent_id IS ?",
    )
    .bind(project_id)
    .bind(parent_id)
    .fetch_one(pool)
    .await?;

    let id = Ulid::new().to_string();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO chapters
            (id, project_id, parent_id, sort, title, summary, content_json,
             word_count, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, '{}', 0, 'draft', ?, ?)",
    )
    .bind(&id)
    .bind(project_id)
    .bind(parent_id)
    .bind(next_sort)
    .bind(trimmed)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(Chapter {
        id,
        project_id: project_id.to_string(),
        parent_id: parent_id.map(str::to_string),
        sort: next_sort,
        title: trimmed.to_string(),
        summary: None,
        word_count: 0,
        status: "draft".into(),
        created_at: now,
        updated_at: now,
    })
}

pub async fn rename(pool: &SqlitePool, id: &str, title: &str) -> AppResult<()> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput("title must not be empty".into()));
    }

    let result = sqlx::query("UPDATE chapters SET title = ?, updated_at = ? WHERE id = ?")
        .bind(trimmed)
        .bind(now_ms())
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("chapter {id}")));
    }
    Ok(())
}

pub async fn set_status(pool: &SqlitePool, id: &str, status: &str) -> AppResult<()> {
    validate_status(status)?;

    let result = sqlx::query("UPDATE chapters SET status = ?, updated_at = ? WHERE id = ?")
        .bind(status)
        .bind(now_ms())
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("chapter {id}")));
    }
    Ok(())
}

pub async fn move_to(
    pool: &SqlitePool,
    id: &str,
    parent_id: Option<&str>,
    sort: i64,
) -> AppResult<()> {
    let project_id: Option<String> =
        sqlx::query_scalar("SELECT project_id FROM chapters WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;
    let project_id = project_id.ok_or_else(|| AppError::NotFound(format!("chapter {id}")))?;

    if let Some(parent_id) = parent_id {
        if parent_id == id {
            return Err(AppError::InvalidInput(
                "chapter cannot be its own parent".into(),
            ));
        }

        let parent_project_id: Option<String> =
            sqlx::query_scalar("SELECT project_id FROM chapters WHERE id = ?")
                .bind(parent_id)
                .fetch_optional(pool)
                .await?;
        let parent_project_id =
            parent_project_id.ok_or_else(|| AppError::NotFound(format!("chapter {parent_id}")))?;
        if parent_project_id != project_id {
            return Err(AppError::InvalidInput(
                "chapter parent must belong to the same project".into(),
            ));
        }

        let would_create_cycle: i64 = sqlx::query_scalar(
            "WITH RECURSIVE descendants(id) AS (
                SELECT id FROM chapters WHERE parent_id = ?
                UNION ALL
                SELECT c.id FROM chapters c
                JOIN descendants d ON c.parent_id = d.id
             )
             SELECT EXISTS(SELECT 1 FROM descendants WHERE id = ?)",
        )
        .bind(id)
        .bind(parent_id)
        .fetch_one(pool)
        .await?;
        if would_create_cycle != 0 {
            return Err(AppError::InvalidInput(
                "chapter cannot be moved under its own descendant".into(),
            ));
        }
    }

    let result =
        sqlx::query("UPDATE chapters SET parent_id = ?, sort = ?, updated_at = ? WHERE id = ?")
            .bind(parent_id)
            .bind(sort)
            .bind(now_ms())
            .bind(id)
            .execute(pool)
            .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("chapter {id}")));
    }
    Ok(())
}

pub async fn reorder(pool: &SqlitePool, items: &[(String, i64)]) -> AppResult<()> {
    if items.is_empty() {
        return Ok(());
    }

    let now = now_ms();
    let mut tx = pool.begin().await?;
    for (id, sort) in items {
        sqlx::query("UPDATE chapters SET sort = ?, updated_at = ? WHERE id = ?")
            .bind(sort)
            .bind(now)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}

pub async fn delete(pool: &SqlitePool, id: &str) -> AppResult<()> {
    let result = sqlx::query("DELETE FROM chapters WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("chapter {id}")));
    }
    Ok(())
}
