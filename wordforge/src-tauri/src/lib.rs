mod commands;
mod db;
mod error;

use tauri::Manager;
use tracing::error;
use tracing_subscriber::EnvFilter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
