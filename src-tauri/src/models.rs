use serde::{Deserialize, Serialize};

/// SteamID64 of the first-ever Steam account. account_id (Dota 32-bit) = steamID64 - this.
pub const STEAM64_BASE: i64 = 76_561_197_960_265_728;

/// A saved player in the roster (mirrors a `players` table row).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub id: i64,
    pub account_id: Option<i64>,
    pub steam_id64: Option<String>,
    pub steam_name: String,
    pub avatar_url: Option<String>,
    pub rank_tier: Option<i64>,
    pub rank_label: Option<String>,
    pub mmr: i64,
    pub discord_username: Option<String>,
    pub discord_url: Option<String>,
    pub discord_id: Option<String>,
    pub notes: Option<String>,
    /// Preferred positions 1..=5 (Carry, Mid, Offlane, Soft/Hard Support).
    #[serde(default)]
    pub roles: Vec<i64>,
    pub last_fetched_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Payload from the frontend to create or update a player.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerInput {
    pub account_id: Option<i64>,
    pub steam_id64: Option<String>,
    pub steam_name: String,
    pub avatar_url: Option<String>,
    pub rank_tier: Option<i64>,
    pub rank_label: Option<String>,
    pub mmr: i64,
    pub discord_username: Option<String>,
    pub discord_url: Option<String>,
    pub discord_id: Option<String>,
    pub notes: Option<String>,
    #[serde(default)]
    pub roles: Vec<i64>,
}

/// One candidate returned by OpenDota's `/search` endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DotaSearchResult {
    pub account_id: i64,
    pub persona_name: Option<String>,
    pub avatar_full: Option<String>,
    pub last_match_time: Option<String>,
    pub similarity: Option<f64>,
}

/// Resolved Dota/Steam profile data fetched from OpenDota's `/players/{id}`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DotaProfile {
    pub account_id: i64,
    pub steam_id64: String,
    pub persona_name: Option<String>,
    pub avatar_full: Option<String>,
    pub profile_url: Option<String>,
    pub rank_tier: Option<i64>,
    pub leaderboard_rank: Option<i64>,
    pub rank_label: Option<String>,
    pub estimated_mmr: i64,
    /// True when OpenDota returned a null `profile` (private / never indexed).
    pub is_private: bool,
}

/// Normalised Steam identifiers derived from arbitrary user input.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedSteamId {
    pub account_id: i64,
    pub steam_id64: String,
}

/// The 5v5 board: each team is exactly 5 slots; `None` = empty slot.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardState {
    pub team_a: Vec<Option<i64>>,
    pub team_b: Vec<Option<i64>>,
}

impl Default for BoardState {
    fn default() -> Self {
        BoardState {
            team_a: vec![None; 5],
            team_b: vec![None; 5],
        }
    }
}

/// Lobby metadata set by the host (region / room name / password).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lobby {
    pub region: String,
    pub room_name: String,
    pub room_password: String,
    pub discord_webhook: String,
}

/// A portable snapshot of all app data, used for export/import (sharing setups).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportBundle {
    #[serde(default)]
    pub version: u32,
    #[serde(default)]
    pub exported_at: String,
    #[serde(default)]
    pub app_version: String,
    pub players: Vec<Player>,
    pub board: BoardState,
    pub lobby: Lobby,
}
