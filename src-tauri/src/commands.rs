use std::sync::MutexGuard;

use rusqlite::Connection;
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::models::{
    BoardState, DotaProfile, DotaSearchResult, ExportBundle, Lobby, Player, PlayerInput,
    ResolvedSteamId,
};
use crate::{db, opendota, AppState};

fn lock<'a>(state: &'a State<'_, AppState>) -> AppResult<MutexGuard<'a, Connection>> {
    state
        .db
        .lock()
        .map_err(|_| AppError::Other("Ошибка доступа к базе данных.".into()))
}

// ----------------------------------------------------------------------------
// Player CRUD
// ----------------------------------------------------------------------------

#[tauri::command]
pub fn list_players(state: State<'_, AppState>) -> AppResult<Vec<Player>> {
    let conn = lock(&state)?;
    db::list_players(&conn)
}

#[tauri::command]
pub fn get_player(state: State<'_, AppState>, id: i64) -> AppResult<Option<Player>> {
    let conn = lock(&state)?;
    db::get_player(&conn, id)
}

#[tauri::command]
pub fn create_player(state: State<'_, AppState>, input: PlayerInput) -> AppResult<Player> {
    let conn = lock(&state)?;
    db::create_player(&conn, &input)
}

#[tauri::command]
pub fn update_player(
    state: State<'_, AppState>,
    id: i64,
    input: PlayerInput,
) -> AppResult<Player> {
    let conn = lock(&state)?;
    db::update_player(&conn, id, &input)
}

#[tauri::command]
pub fn delete_player(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let conn = lock(&state)?;
    db::delete_player(&conn, id)
}

#[tauri::command]
pub fn set_player_active(state: State<'_, AppState>, id: i64, active: bool) -> AppResult<Player> {
    let conn = lock(&state)?;
    db::set_player_active(&conn, id, active)
}

// ----------------------------------------------------------------------------
// Board
// ----------------------------------------------------------------------------

#[tauri::command]
pub fn get_board(state: State<'_, AppState>) -> AppResult<BoardState> {
    let conn = lock(&state)?;
    db::get_board(&conn)
}

#[tauri::command]
pub fn save_board(
    state: State<'_, AppState>,
    team_a: Vec<Option<i64>>,
    team_b: Vec<Option<i64>>,
) -> AppResult<()> {
    let conn = lock(&state)?;
    db::save_board(&conn, &team_a, &team_b)
}

// ----------------------------------------------------------------------------
// Lobby
// ----------------------------------------------------------------------------

#[tauri::command]
pub fn get_lobby(state: State<'_, AppState>) -> AppResult<Lobby> {
    let conn = lock(&state)?;
    db::get_lobby(&conn)
}

#[tauri::command]
pub fn save_lobby(
    state: State<'_, AppState>,
    region: String,
    room_name: String,
    room_password: String,
    discord_webhook: String,
) -> AppResult<()> {
    let conn = lock(&state)?;
    db::save_lobby(&conn, &region, &room_name, &room_password, &discord_webhook)
}

/// Post the lineup to the configured Discord webhook: a PNG image of the teams
/// plus copyable text (lobby info + player pings).
#[tauri::command]
pub async fn send_to_discord(
    state: State<'_, AppState>,
    content: String,
    user_ids: Vec<String>,
    image_base64: String,
) -> AppResult<()> {
    use base64::Engine;

    // Read the webhook URL, releasing the DB lock before any await.
    let webhook = {
        let conn = lock(&state)?;
        db::get_lobby(&conn)?.discord_webhook.trim().to_string()
    };
    if webhook.is_empty() {
        return Err(AppError::Invalid(
            "Сначала укажите ссылку Discord webhook в настройках.".into(),
        ));
    }

    let payload = serde_json::json!({
        "content": content,
        "allowed_mentions": { "parse": [], "users": user_ids },
    });

    let mut form = reqwest::multipart::Form::new().text("payload_json", payload.to_string());

    let img = image_base64.trim();
    if !img.is_empty() {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(img)
            .map_err(|e| AppError::Other(format!("Не удалось декодировать изображение: {e}")))?;
        let part = reqwest::multipart::Part::bytes(bytes)
            .file_name("lineup.png")
            .mime_str("image/png")?;
        form = form.part("files[0]", part);
    }

    let resp = state.http.post(&webhook).multipart(form).send().await?;
    if !resp.status().is_success() {
        let code = resp.status().as_u16();
        return Err(AppError::Network(format!(
            "Discord отклонил запрос (HTTP {code}). Проверьте ссылку webhook."
        )));
    }
    Ok(())
}

// ----------------------------------------------------------------------------
// Data export / import (share setups across users)
// ----------------------------------------------------------------------------

/// Serialize all app data to a JSON file in the user's Downloads folder.
/// Returns the full path of the written file.
#[tauri::command]
pub fn export_data(app: tauri::AppHandle, state: State<'_, AppState>) -> AppResult<String> {
    use tauri::Manager;

    let bundle = {
        let conn = lock(&state)?;
        ExportBundle {
            version: 1,
            exported_at: chrono::Utc::now().to_rfc3339(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            players: db::list_players(&conn)?,
            board: db::get_board(&conn)?,
            lobby: db::get_lobby(&conn)?,
        }
    };
    let json = serde_json::to_string_pretty(&bundle)?;

    let dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| AppError::Other(format!("Не удалось найти папку для сохранения: {e}")))?;
    let stamp = chrono::Utc::now().format("%Y%m%d-%H%M%S");
    let path = dir.join(format!("dota5v5-data-{stamp}.json"));
    std::fs::write(&path, json)
        .map_err(|e| AppError::Other(format!("Не удалось сохранить файл: {e}")))?;
    Ok(path.to_string_lossy().to_string())
}

/// Replace ALL current data with a previously-exported snapshot.
#[tauri::command]
pub fn import_data(state: State<'_, AppState>, bundle: ExportBundle) -> AppResult<()> {
    let mut conn = lock(&state)?;
    db::import_data(&mut conn, &bundle.players, &bundle.board, &bundle.lobby)
}

// ----------------------------------------------------------------------------
// Helpers (no network)
// ----------------------------------------------------------------------------

#[tauri::command]
pub fn resolve_steam_input(raw: String) -> AppResult<ResolvedSteamId> {
    opendota::resolve_steam_input(&raw)
}

#[tauri::command]
pub fn estimate_mmr_from_rank(rank_tier: Option<i64>, leaderboard_rank: Option<i64>) -> i64 {
    opendota::estimate_mmr(rank_tier, leaderboard_rank)
}

// ----------------------------------------------------------------------------
// OpenDota (network, async)
// ----------------------------------------------------------------------------

#[tauri::command]
pub async fn search_dota_players(
    state: State<'_, AppState>,
    query: String,
) -> AppResult<Vec<DotaSearchResult>> {
    opendota::search_players(&state.http, &query).await
}

#[tauri::command]
pub async fn fetch_dota_profile(
    state: State<'_, AppState>,
    account_id: i64,
) -> AppResult<DotaProfile> {
    opendota::fetch_profile(&state.http, account_id).await
}

#[tauri::command]
pub async fn refresh_player_from_dota(
    state: State<'_, AppState>,
    id: i64,
) -> AppResult<Player> {
    // Read the linked account_id first, releasing the lock before any await.
    let account_id = {
        let conn = lock(&state)?;
        let player = db::get_player(&conn, id)?.ok_or(AppError::NotFound)?;
        player
            .account_id
            .ok_or_else(|| AppError::Invalid("У игрока не привязан аккаунт Dota.".into()))?
    };

    let profile = opendota::fetch_profile(&state.http, account_id).await?;

    // Re-lock after the network call to persist the refreshed data.
    let conn = lock(&state)?;
    db::apply_dota_refresh(
        &conn,
        id,
        profile.persona_name.as_deref(),
        profile.avatar_full.as_deref(),
        profile.rank_tier,
        profile.rank_label.as_deref(),
        Some(profile.steam_id64.as_str()),
        Some(profile.account_id),
    )
}
