use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use ulid::Ulid;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct OutlineNode {
    pub id: String,
    pub project_id: String,
    pub parent_id: Option<String>,
    pub sort: i64,
    pub title: String,
    pub content_md: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlineInput {
    pub title: String,
    pub content_md: String,
    pub status: String,
}

const VALID_STATUS: &[&str] = &["idea", "drafting", "done"];

pub async fn list_by_project(pool: &SqlitePool, project_id: &str) -> AppResult<Vec<OutlineNode>> {
    let rows = sqlx::query_as::<_, OutlineNode>(
        "SELECT id, project_id, parent_id, sort, title, content_md, status
         FROM outline_nodes
         WHERE project_id = ?
         ORDER BY COALESCE(parent_id, ''), sort, title",
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
    input: &OutlineInput,
) -> AppResult<OutlineNode> {
    let title = normalize_title(&input.title)?;
    validate_status(&input.status)?;
    if let Some(parent_id) = parent_id {
        ensure_same_project(pool, project_id, parent_id).await?;
    }

    let next_sort: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort), -1) + 1 FROM outline_nodes
         WHERE project_id = ? AND parent_id IS ?",
    )
    .bind(project_id)
    .bind(parent_id)
    .fetch_one(pool)
    .await?;

    let id = Ulid::new().to_string();
    let content_md = input.content_md.trim();
    sqlx::query(
        "INSERT INTO outline_nodes
            (id, project_id, parent_id, sort, title, content_md, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(project_id)
    .bind(parent_id)
    .bind(next_sort)
    .bind(title)
    .bind(content_md)
    .bind(&input.status)
    .execute(pool)
    .await?;

    Ok(OutlineNode {
        id,
        project_id: project_id.to_string(),
        parent_id: parent_id.map(str::to_string),
        sort: next_sort,
        title: title.to_string(),
        content_md: content_md.to_string(),
        status: input.status.to_string(),
    })
}

pub async fn update(pool: &SqlitePool, id: &str, input: &OutlineInput) -> AppResult<()> {
    let title = normalize_title(&input.title)?;
    validate_status(&input.status)?;
    let result = sqlx::query(
        "UPDATE outline_nodes
         SET title = ?, content_md = ?, status = ?
         WHERE id = ?",
    )
    .bind(title)
    .bind(input.content_md.trim())
    .bind(&input.status)
    .bind(id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("outline node {id}")));
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
        sqlx::query_scalar("SELECT project_id FROM outline_nodes WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;
    let project_id = project_id.ok_or_else(|| AppError::NotFound(format!("outline node {id}")))?;

    if let Some(parent_id) = parent_id {
        if parent_id == id {
            return Err(AppError::InvalidInput(
                "outline node cannot be its own parent".into(),
            ));
        }
        ensure_same_project(pool, &project_id, parent_id).await?;
        let would_create_cycle: i64 = sqlx::query_scalar(
            "WITH RECURSIVE descendants(id) AS (
                SELECT id FROM outline_nodes WHERE parent_id = ?
                UNION ALL
                SELECT n.id FROM outline_nodes n
                JOIN descendants d ON n.parent_id = d.id
             )
             SELECT EXISTS(SELECT 1 FROM descendants WHERE id = ?)",
        )
        .bind(id)
        .bind(parent_id)
        .fetch_one(pool)
        .await?;
        if would_create_cycle != 0 {
            return Err(AppError::InvalidInput(
                "outline node cannot be moved under its own descendant".into(),
            ));
        }
    }

    let result = sqlx::query("UPDATE outline_nodes SET parent_id = ?, sort = ? WHERE id = ?")
        .bind(parent_id)
        .bind(sort)
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("outline node {id}")));
    }
    Ok(())
}

pub async fn reorder(pool: &SqlitePool, items: &[(String, i64)]) -> AppResult<()> {
    if items.is_empty() {
        return Ok(());
    }

    let mut tx = pool.begin().await?;
    for (id, sort) in items {
        sqlx::query("UPDATE outline_nodes SET sort = ? WHERE id = ?")
            .bind(sort)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}

pub async fn delete(pool: &SqlitePool, id: &str) -> AppResult<()> {
    let result = sqlx::query("DELETE FROM outline_nodes WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("outline node {id}")));
    }
    Ok(())
}

async fn ensure_same_project(pool: &SqlitePool, project_id: &str, id: &str) -> AppResult<()> {
    let parent_project_id: Option<String> =
        sqlx::query_scalar("SELECT project_id FROM outline_nodes WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;
    let parent_project_id =
        parent_project_id.ok_or_else(|| AppError::NotFound(format!("outline node {id}")))?;
    if parent_project_id != project_id {
        return Err(AppError::InvalidInput(
            "outline parent must belong to the same project".into(),
        ));
    }
    Ok(())
}

fn normalize_title(value: &str) -> AppResult<&str> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput("title must not be empty".into()));
    }
    Ok(trimmed)
}

fn validate_status(status: &str) -> AppResult<()> {
    if VALID_STATUS.contains(&status) {
        Ok(())
    } else {
        Err(AppError::InvalidInput(format!(
            "status must be one of {VALID_STATUS:?}, got {status}"
        )))
    }
}
