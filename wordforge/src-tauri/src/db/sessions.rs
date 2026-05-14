use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use ulid::Ulid;

use crate::db::now_ms;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WritingSession {
    pub id: String,
    pub project_id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub words_written: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WritingStats {
    pub today_words: i64,
    pub week_words: i64,
    pub month_words: i64,
    pub streak: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct DailyWords {
    pub day: String,
    pub words: i64,
}

pub async fn start(pool: &SqlitePool, project_id: &str) -> AppResult<WritingSession> {
    let id = Ulid::new().to_string();
    let now = now_ms();
    sqlx::query(
        "INSERT INTO writing_sessions (id, project_id, started_at, ended_at, words_written)
         VALUES (?, ?, ?, NULL, 0)",
    )
    .bind(&id)
    .bind(project_id)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(WritingSession {
        id,
        project_id: project_id.to_string(),
        started_at: now,
        ended_at: None,
        words_written: 0,
    })
}

pub async fn end(pool: &SqlitePool, id: &str, words_written: i64) -> AppResult<()> {
    let result =
        sqlx::query("UPDATE writing_sessions SET ended_at = ?, words_written = ? WHERE id = ?")
            .bind(now_ms())
            .bind(words_written.max(0))
            .bind(id)
            .execute(pool)
            .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("session {id}")));
    }
    Ok(())
}

pub async fn get_stats(pool: &SqlitePool, project_id: &str) -> AppResult<WritingStats> {
    let today_words: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(words_written), 0)
         FROM writing_sessions
         WHERE project_id = ?
           AND date(started_at/1000, 'unixepoch', 'localtime') = date('now', 'localtime')",
    )
    .bind(project_id)
    .fetch_one(pool)
    .await?;

    let week_words: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(words_written), 0)
         FROM writing_sessions
         WHERE project_id = ?
           AND date(started_at/1000, 'unixepoch', 'localtime') >= date(
             'now',
             'localtime',
             '-' || ((CAST(strftime('%w', 'now', 'localtime') AS INTEGER) + 6) % 7) || ' days'
           )",
    )
    .bind(project_id)
    .fetch_one(pool)
    .await?;

    let month_words: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(words_written), 0)
         FROM writing_sessions
         WHERE project_id = ?
           AND strftime('%Y-%m', started_at/1000, 'unixepoch', 'localtime') = strftime('%Y-%m', 'now', 'localtime')",
    )
    .bind(project_id)
    .fetch_one(pool)
    .await?;

    let days: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT date(started_at/1000, 'unixepoch', 'localtime') as day
         FROM writing_sessions
         WHERE project_id = ? AND words_written > 0
         ORDER BY day DESC
         LIMIT 400",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;

    let today: String = sqlx::query_scalar("SELECT date('now', 'localtime')")
        .fetch_one(pool)
        .await?;

    let streak = compute_streak(&days, &today);

    Ok(WritingStats {
        today_words,
        week_words,
        month_words,
        streak,
    })
}

pub async fn get_daily_words(
    pool: &SqlitePool,
    project_id: &str,
    days: i64,
) -> AppResult<Vec<DailyWords>> {
    let days = days.clamp(1, 365);
    let modifier = format!("-{} days", days - 1);
    let rows = sqlx::query_as::<_, DailyWords>(
        "SELECT date(started_at/1000, 'unixepoch', 'localtime') as day,
                SUM(words_written) as words
         FROM writing_sessions
         WHERE project_id = ?
           AND started_at >= CAST(strftime('%s', 'now', 'localtime', ?) AS INTEGER) * 1000
         GROUP BY day
         ORDER BY day",
    )
    .bind(project_id)
    .bind(&modifier)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

fn compute_streak(days: &[String], today: &str) -> i64 {
    if days.is_empty() {
        return 0;
    }
    let yesterday = prev_date(today);
    if days[0] != today && days[0] != yesterday {
        return 0;
    }

    let mut streak = 1i64;
    let mut prev_secs = date_to_unix_secs(&days[0]);
    for day in days.iter().skip(1) {
        let secs = date_to_unix_secs(day);
        if prev_secs - secs == 86400 {
            streak += 1;
            prev_secs = secs;
        } else {
            break;
        }
    }
    streak
}

fn prev_date(date: &str) -> String {
    let secs = date_to_unix_secs(date);
    if secs < 86400 {
        return date.to_string();
    }
    unix_secs_to_date_str(secs - 86400)
}

fn unix_secs_to_date_str(secs: u64) -> String {
    let z = (secs / 86400) as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}")
}

fn date_to_unix_secs(date: &str) -> u64 {
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return 0;
    }
    let y: i64 = parts[0].parse().unwrap_or(0);
    let m: i64 = parts[1].parse().unwrap_or(0);
    let d: i64 = parts[2].parse().unwrap_or(0);
    let m_adj = if m <= 2 { m + 9 } else { m - 3 };
    let y_adj = if m <= 2 { y - 1 } else { y };
    let era = if y_adj >= 0 { y_adj } else { y_adj - 399 } / 400;
    let yoe = y_adj - era * 400;
    let doy = (153 * m_adj + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146097 + doe - 719468;
    (days * 86400) as u64
}
