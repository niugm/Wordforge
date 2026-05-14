use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use ulid::Ulid;

use crate::db::now_ms;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub alias: Option<String>,
    pub avatar_path: Option<String>,
    pub role_type: Option<String>,
    pub profile_md: String,
    pub attributes_json: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterInput {
    pub name: String,
    pub alias: Option<String>,
    pub avatar_path: Option<String>,
    pub role_type: Option<String>,
    pub profile_md: String,
    pub attributes_json: String,
}

pub async fn list_by_project(pool: &SqlitePool, project_id: &str) -> AppResult<Vec<Character>> {
    let rows = sqlx::query_as::<_, Character>(
        "SELECT id, project_id, name, alias, avatar_path, role_type,
                profile_md, attributes_json, created_at, updated_at
         FROM characters
         WHERE project_id = ?
         ORDER BY updated_at DESC, name ASC",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn create(
    pool: &SqlitePool,
    project_id: &str,
    input: &CharacterInput,
) -> AppResult<Character> {
    let name = normalize_required(&input.name, "name")?;
    let alias = normalize_optional(input.alias.as_deref());
    let avatar_path = normalize_optional(input.avatar_path.as_deref());
    let role_type = normalize_optional(input.role_type.as_deref());
    let profile_md = input.profile_md.trim();
    let attributes_json = normalize_attributes(&input.attributes_json)?;
    let id = Ulid::new().to_string();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO characters
            (id, project_id, name, alias, avatar_path, role_type,
             profile_md, attributes_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(project_id)
    .bind(name)
    .bind(alias)
    .bind(avatar_path)
    .bind(role_type)
    .bind(profile_md)
    .bind(attributes_json)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(Character {
        id,
        project_id: project_id.to_string(),
        name: name.to_string(),
        alias: alias.map(str::to_string),
        avatar_path: avatar_path.map(str::to_string),
        role_type: role_type.map(str::to_string),
        profile_md: profile_md.to_string(),
        attributes_json: attributes_json.to_string(),
        created_at: now,
        updated_at: now,
    })
}

pub async fn update(pool: &SqlitePool, id: &str, input: &CharacterInput) -> AppResult<()> {
    let name = normalize_required(&input.name, "name")?;
    let attributes_json = normalize_attributes(&input.attributes_json)?;
    let result = sqlx::query(
        "UPDATE characters
         SET name = ?, alias = ?, avatar_path = ?, role_type = ?,
             profile_md = ?, attributes_json = ?, updated_at = ?
         WHERE id = ?",
    )
    .bind(name)
    .bind(normalize_optional(input.alias.as_deref()))
    .bind(normalize_optional(input.avatar_path.as_deref()))
    .bind(normalize_optional(input.role_type.as_deref()))
    .bind(input.profile_md.trim())
    .bind(attributes_json)
    .bind(now_ms())
    .bind(id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("character {id}")));
    }
    Ok(())
}

pub async fn delete(pool: &SqlitePool, id: &str) -> AppResult<()> {
    let result = sqlx::query("DELETE FROM characters WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("character {id}")));
    }
    Ok(())
}

fn normalize_required<'a>(value: &'a str, field: &str) -> AppResult<&'a str> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput(format!("{field} must not be empty")));
    }
    Ok(trimmed)
}

fn normalize_optional(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|v| !v.is_empty())
}

fn normalize_attributes(value: &str) -> AppResult<&str> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok("{}");
    }
    let parsed: serde_json::Value = serde_json::from_str(trimmed)
        .map_err(|_| AppError::InvalidInput("attributes_json must be valid JSON".into()))?;
    if !parsed.is_object() {
        return Err(AppError::InvalidInput(
            "attributes_json must be a JSON object".into(),
        ));
    }
    Ok(trimmed)
}
