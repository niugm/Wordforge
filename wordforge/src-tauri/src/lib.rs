mod commands;
mod db;
mod error;

use tauri::Manager;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tracing_subscriber::fmt()
                .with_env_filter(
                    EnvFilter::try_from_default_env().unwrap_or_else(|_| "wordforge=info".into()),
                )
                .init();

            let app_data_dir = app.path().app_data_dir()?;
            let pool =
                tauri::async_runtime::block_on(db::init_pool(&app_data_dir)).map_err(|e| {
                    error!(error = %e, "failed to initialize database pool");
                    e
                })?;
            app.manage(pool);
            app.manage(app_data_dir);
            let pool = app.state::<sqlx::SqlitePool>().inner().clone();
            let app_data_dir = app.state::<std::path::PathBuf>().inner().clone();
            tauri::async_runtime::spawn(async move {
                match db::settings::run_auto_backup_if_due(&pool, &app_data_dir).await {
                    Ok(Some(result)) => {
                        info!(path = %result.path, "automatic database backup completed");
                    }
                    Ok(None) => {}
                    Err(e) => {
                        error!(error = %e, "automatic database backup failed");
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::projects::list_projects,
            commands::projects::create_project,
            commands::projects::update_project_meta,
            commands::projects::rename_project,
            commands::projects::archive_project,
            commands::projects::delete_project,
            commands::chapters::list_chapters,
            commands::chapters::get_chapter,
            commands::chapters::get_chapter_content,
            commands::chapters::update_chapter_content,
            commands::chapters::create_chapter,
            commands::chapters::duplicate_chapter,
            commands::chapters::rename_chapter,
            commands::chapters::set_chapter_status,
            commands::chapters::move_chapter,
            commands::chapters::reorder_chapters,
            commands::chapters::delete_chapter,
            commands::characters::list_characters,
            commands::characters::create_character,
            commands::characters::update_character,
            commands::characters::delete_character,
            commands::outlines::list_outlines,
            commands::outlines::create_outline,
            commands::outlines::update_outline,
            commands::outlines::move_outline,
            commands::outlines::reorder_outlines,
            commands::outlines::delete_outline,
            commands::sessions::start_session,
            commands::sessions::end_session,
            commands::sessions::get_writing_stats,
            commands::sessions::get_daily_words,
            commands::settings::get_backup_settings,
            commands::settings::update_backup_settings,
            commands::settings::backup_now,
            commands::settings::list_ai_credentials,
            commands::settings::save_ai_credential,
            commands::settings::delete_ai_credential,
            commands::exports::export_project,
            commands::exports::export_chapter,
            commands::search::search_chapter_body,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
