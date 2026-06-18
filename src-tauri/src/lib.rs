mod commands;
mod db;
mod error;
mod models;
mod opendota;

use std::sync::Mutex;
use std::time::Duration;

use tauri::Manager;

/// Shared application state: a single SQLite connection + a reusable HTTP client.
pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
    pub http: reqwest::Client,
}

/// Lightweight backend connectivity check used by the frontend on startup.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! Backend is live.")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Resolve a writable per-user data directory and open the database there.
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("could not resolve app data dir");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join("dota5v5.db");
            let conn = db::open(&db_path).expect("failed to open database");

            let http = reqwest::Client::builder()
                .user_agent("dota5v5/0.1 (5v5 lobby organizer)")
                .timeout(Duration::from_secs(12))
                .build()
                .expect("failed to build HTTP client");

            app.manage(AppState {
                db: Mutex::new(conn),
                http,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::list_players,
            commands::get_player,
            commands::create_player,
            commands::update_player,
            commands::delete_player,
            commands::set_player_active,
            commands::get_board,
            commands::save_board,
            commands::get_lobby,
            commands::save_lobby,
            commands::export_data,
            commands::import_data,
            commands::send_to_discord,
            commands::resolve_steam_input,
            commands::estimate_mmr_from_rank,
            commands::search_dota_players,
            commands::fetch_dota_profile,
            commands::refresh_player_from_dota,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
