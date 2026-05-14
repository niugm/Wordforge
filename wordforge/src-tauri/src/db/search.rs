use serde::Serialize;
use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ChapterSearchResult {
    pub chapter_id: String,
    pub title: String,
    pub snippet: String,
    pub rank: f64,
}

pub async fn search_chapter_body(
    pool: &SqlitePool,
    project_id: &str,
    query: &str,
    limit: i64,
) -> AppResult<Vec<ChapterSearchResult>> {
    let query = query.trim();
    if query.len() < 2 {
        return Ok(Vec::new());
    }

    let limit = limit.clamp(1, 50);
    let fts_query = build_fts_query(query)?;
    let rows = sqlx::query_as::<_, ChapterSearchResult>(
        "SELECT c.id AS chapter_id,
                c.title AS title,
                snippet(chapters_fts, 1, '<mark>', '</mark>', '...', 16) AS snippet,
                bm25(chapters_fts) AS rank
         FROM chapters_fts
         JOIN chapters c ON c.id = chapters_fts.chapter_id
         WHERE c.project_id = ?
           AND chapters_fts MATCH ?
         ORDER BY rank
         LIMIT ?",
    )
    .bind(project_id)
    .bind(fts_query)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

fn build_fts_query(query: &str) -> AppResult<String> {
    let terms: Vec<String> = query
        .split_whitespace()
        .map(|term| {
            term.chars()
                .filter(|ch| ch.is_alphanumeric() || *ch == '_' || *ch == '-')
                .collect::<String>()
        })
        .filter(|term| !term.is_empty())
        .map(|term| format!("\"{}\"*", term.replace('"', "\"\"")))
        .collect();

    if terms.is_empty() {
        return Err(AppError::InvalidInput("search query is empty".into()));
    }

    Ok(terms.join(" AND "))
}
