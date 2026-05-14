pub mod chapters;
pub mod characters;
pub mod exports;
pub mod outlines;
pub mod projects;
pub mod sessions;
pub mod settings;

use std::path::Path;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use tracing::info;

use crate::error::AppResult;

pub async fn init_pool(app_data_dir: &Path) -> AppResult<SqlitePool> {
    let dir = app_data_dir.join("wordforge");
    std::fs::create_dir_all(&dir)?;
    let db_path = dir.join("wordforge.db");
    info!(path = %db_path.display(), "initializing sqlite pool");

    let opts = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(8)
        .connect_with(opts)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    info!("migrations applied");

    Ok(pool)
}

pub fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
