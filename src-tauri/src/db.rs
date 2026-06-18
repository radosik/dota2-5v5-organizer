use std::path::Path;

use chrono::Utc;
use rusqlite::{params, Connection, Row};

use crate::error::{AppError, AppResult};
use crate::models::{BoardState, Lobby, Player, PlayerInput};

const PLAYER_COLS: &str = "id, account_id, steam_id64, steam_name, avatar_url, rank_tier, \
     rank_label, mmr, discord_username, discord_url, discord_id, notes, last_fetched_at, created_at, updated_at, roles, is_active";

/// Open the database at `path` and run migrations.
pub fn open(path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS players (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id       INTEGER UNIQUE,
            steam_id64       TEXT,
            steam_name       TEXT NOT NULL,
            avatar_url       TEXT,
            rank_tier        INTEGER,
            rank_label       TEXT,
            mmr              INTEGER NOT NULL DEFAULT 0,
            discord_username TEXT,
            discord_url      TEXT,
            discord_id       TEXT,
            notes            TEXT,
            last_fetched_at  TEXT,
            created_at       TEXT NOT NULL,
            updated_at       TEXT NOT NULL,
            roles            TEXT,
            is_active        INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS board_state (
            id         INTEGER PRIMARY KEY CHECK (id = 1),
            team_a     TEXT NOT NULL,
            team_b     TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lobby (
            id              INTEGER PRIMARY KEY CHECK (id = 1),
            region          TEXT NOT NULL DEFAULT '',
            room_name       TEXT NOT NULL DEFAULT '',
            room_password   TEXT NOT NULL DEFAULT '',
            discord_webhook TEXT NOT NULL DEFAULT '',
            updated_at      TEXT NOT NULL
        );
        ",
    )?;

    // Add columns to databases created by earlier versions (ignored if present).
    let _ = conn.execute("ALTER TABLE players ADD COLUMN discord_id TEXT", []);
    let _ = conn.execute("ALTER TABLE players ADD COLUMN roles TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE players ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE lobby ADD COLUMN discord_webhook TEXT NOT NULL DEFAULT ''",
        [],
    );

    conn.execute(
        "INSERT OR IGNORE INTO lobby (id, region, room_name, room_password, updated_at)
         VALUES (1, '', '', '', ?1)",
        params![now()],
    )?;

    // Ensure the single board row exists.
    let empty = serde_json::to_string(&vec![Option::<i64>::None; 5])?;
    conn.execute(
        "INSERT OR IGNORE INTO board_state (id, team_a, team_b, updated_at) VALUES (1, ?1, ?2, ?3)",
        params![empty, empty, now()],
    )?;
    Ok(())
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn row_to_player(row: &Row) -> rusqlite::Result<Player> {
    Ok(Player {
        id: row.get(0)?,
        account_id: row.get(1)?,
        steam_id64: row.get(2)?,
        steam_name: row.get(3)?,
        avatar_url: row.get(4)?,
        rank_tier: row.get(5)?,
        rank_label: row.get(6)?,
        mmr: row.get(7)?,
        discord_username: row.get(8)?,
        discord_url: row.get(9)?,
        discord_id: row.get(10)?,
        notes: row.get(11)?,
        last_fetched_at: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
        roles: row
            .get::<_, Option<String>>(15)?
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default(),
        is_active: row.get::<_, i64>(16)? != 0,
    })
}

// ----------------------------------------------------------------------------
// Player CRUD
// ----------------------------------------------------------------------------

pub fn list_players(conn: &Connection) -> AppResult<Vec<Player>> {
    let sql = format!(
        "SELECT {PLAYER_COLS} FROM players ORDER BY mmr DESC, steam_name COLLATE NOCASE ASC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], row_to_player)?;
    let mut players = Vec::new();
    for p in rows {
        players.push(p?);
    }
    Ok(players)
}

pub fn get_player(conn: &Connection, id: i64) -> AppResult<Option<Player>> {
    let sql = format!("SELECT {PLAYER_COLS} FROM players WHERE id = ?1");
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query_map(params![id], row_to_player)?;
    match rows.next() {
        Some(p) => Ok(Some(p?)),
        None => Ok(None),
    }
}

pub fn create_player(conn: &Connection, input: &PlayerInput) -> AppResult<Player> {
    let ts = now();
    conn.execute(
        "INSERT INTO players
            (account_id, steam_id64, steam_name, avatar_url, rank_tier, rank_label, mmr,
             discord_username, discord_url, discord_id, notes, roles, is_active, last_fetched_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            input.account_id,
            input.steam_id64,
            input.steam_name,
            input.avatar_url,
            input.rank_tier,
            input.rank_label,
            input.mmr,
            input.discord_username,
            input.discord_url,
            input.discord_id,
            input.notes,
            serde_json::to_string(&input.roles)?,
            input.is_active,
            // last_fetched_at: stamp it if this player carries Dota data
            input.rank_tier.map(|_| ts.clone()),
            ts,
            ts,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_player(conn, id)?.ok_or(AppError::NotFound)
}

pub fn update_player(conn: &Connection, id: i64, input: &PlayerInput) -> AppResult<Player> {
    let affected = conn.execute(
        "UPDATE players SET
            account_id = ?1, steam_id64 = ?2, steam_name = ?3, avatar_url = ?4,
            rank_tier = ?5, rank_label = ?6, mmr = ?7, discord_username = ?8,
            discord_url = ?9, discord_id = ?10, notes = ?11, roles = ?12, is_active = ?13, updated_at = ?14
         WHERE id = ?15",
        params![
            input.account_id,
            input.steam_id64,
            input.steam_name,
            input.avatar_url,
            input.rank_tier,
            input.rank_label,
            input.mmr,
            input.discord_username,
            input.discord_url,
            input.discord_id,
            input.notes,
            serde_json::to_string(&input.roles)?,
            input.is_active,
            now(),
            id,
        ],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    get_player(conn, id)?.ok_or(AppError::NotFound)
}

pub fn delete_player(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM players WHERE id = ?1", params![id])?;
    Ok(())
}

/// Toggle a player's "online/active" flag without touching other fields.
pub fn set_player_active(conn: &Connection, id: i64, active: bool) -> AppResult<Player> {
    let affected = conn.execute(
        "UPDATE players SET is_active = ?1, updated_at = ?2 WHERE id = ?3",
        params![active, now(), id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    get_player(conn, id)?.ok_or(AppError::NotFound)
}

/// Apply fresh Dota data to an existing player (used by refresh).
pub fn apply_dota_refresh(
    conn: &Connection,
    id: i64,
    steam_name: Option<&str>,
    avatar_url: Option<&str>,
    rank_tier: Option<i64>,
    rank_label: Option<&str>,
    steam_id64: Option<&str>,
    account_id: Option<i64>,
) -> AppResult<Player> {
    let mut player = get_player(conn, id)?.ok_or(AppError::NotFound)?;
    if let Some(n) = steam_name {
        player.steam_name = n.to_string();
    }
    player.avatar_url = avatar_url.map(|s| s.to_string()).or(player.avatar_url);
    player.rank_tier = rank_tier.or(player.rank_tier);
    player.rank_label = rank_label.map(|s| s.to_string()).or(player.rank_label);
    player.steam_id64 = steam_id64.map(|s| s.to_string()).or(player.steam_id64);
    player.account_id = account_id.or(player.account_id);

    conn.execute(
        "UPDATE players SET
            account_id = ?1, steam_id64 = ?2, steam_name = ?3, avatar_url = ?4,
            rank_tier = ?5, rank_label = ?6, last_fetched_at = ?7, updated_at = ?7
         WHERE id = ?8",
        params![
            player.account_id,
            player.steam_id64,
            player.steam_name,
            player.avatar_url,
            player.rank_tier,
            player.rank_label,
            now(),
            id,
        ],
    )?;
    get_player(conn, id)?.ok_or(AppError::NotFound)
}

/// Replace ALL app data (players, board, lobby) with an imported snapshot,
/// atomically. Player ids are preserved so board placements remain valid.
pub fn import_data(
    conn: &mut Connection,
    players: &[Player],
    board: &BoardState,
    lobby: &Lobby,
) -> AppResult<()> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM players", [])?;
    for p in players {
        tx.execute(
            "INSERT INTO players
                (id, account_id, steam_id64, steam_name, avatar_url, rank_tier, rank_label, mmr,
                 discord_username, discord_url, discord_id, notes, roles, is_active, last_fetched_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                p.id,
                p.account_id,
                p.steam_id64,
                p.steam_name,
                p.avatar_url,
                p.rank_tier,
                p.rank_label,
                p.mmr,
                p.discord_username,
                p.discord_url,
                p.discord_id,
                p.notes,
                serde_json::to_string(&p.roles)?,
                p.is_active,
                p.last_fetched_at,
                p.created_at,
                p.updated_at,
            ],
        )?;
    }
    let a = serde_json::to_string(&board.team_a)?;
    let b = serde_json::to_string(&board.team_b)?;
    tx.execute(
        "UPDATE board_state SET team_a = ?1, team_b = ?2, updated_at = ?3 WHERE id = 1",
        params![a, b, now()],
    )?;
    tx.execute(
        "UPDATE lobby SET region = ?1, room_name = ?2, room_password = ?3, discord_webhook = ?4, updated_at = ?5 WHERE id = 1",
        params![
            lobby.region,
            lobby.room_name,
            lobby.room_password,
            lobby.discord_webhook,
            now(),
        ],
    )?;
    tx.commit()?;
    Ok(())
}

// ----------------------------------------------------------------------------
// Board state
// ----------------------------------------------------------------------------

pub fn get_board(conn: &Connection) -> AppResult<BoardState> {
    let (a, b): (String, String) = conn.query_row(
        "SELECT team_a, team_b FROM board_state WHERE id = 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;
    let team_a: Vec<Option<i64>> = serde_json::from_str(&a)?;
    let team_b: Vec<Option<i64>> = serde_json::from_str(&b)?;
    Ok(BoardState { team_a, team_b })
}

pub fn save_board(conn: &Connection, team_a: &[Option<i64>], team_b: &[Option<i64>]) -> AppResult<()> {
    let a = serde_json::to_string(team_a)?;
    let b = serde_json::to_string(team_b)?;
    conn.execute(
        "UPDATE board_state SET team_a = ?1, team_b = ?2, updated_at = ?3 WHERE id = 1",
        params![a, b, now()],
    )?;
    Ok(())
}

// ----------------------------------------------------------------------------
// Lobby
// ----------------------------------------------------------------------------

pub fn get_lobby(conn: &Connection) -> AppResult<Lobby> {
    let lobby = conn.query_row(
        "SELECT region, room_name, room_password, discord_webhook FROM lobby WHERE id = 1",
        [],
        |row| {
            Ok(Lobby {
                region: row.get(0)?,
                room_name: row.get(1)?,
                room_password: row.get(2)?,
                discord_webhook: row.get(3)?,
            })
        },
    )?;
    Ok(lobby)
}

pub fn save_lobby(
    conn: &Connection,
    region: &str,
    room_name: &str,
    room_password: &str,
    discord_webhook: &str,
) -> AppResult<()> {
    conn.execute(
        "UPDATE lobby SET region = ?1, room_name = ?2, room_password = ?3, discord_webhook = ?4, updated_at = ?5 WHERE id = 1",
        params![region, room_name, room_password, discord_webhook, now()],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::PlayerInput;

    fn mem() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        conn
    }

    fn sample(name: &str, mmr: i64) -> PlayerInput {
        PlayerInput {
            account_id: None,
            steam_id64: None,
            steam_name: name.to_string(),
            avatar_url: None,
            rank_tier: Some(74),
            rank_label: Some("Divine 4".into()),
            mmr,
            discord_username: None,
            discord_url: None,
            discord_id: None,
            notes: None,
            roles: vec![1, 3],
            is_active: true,
        }
    }

    #[test]
    fn player_crud_roundtrip() {
        let conn = mem();
        assert_eq!(list_players(&conn).unwrap().len(), 0);

        let created = create_player(&conn, &sample("Pudge", 5000)).unwrap();
        assert_eq!(created.steam_name, "Pudge");
        assert_eq!(created.roles, vec![1, 3]); // roles persist as JSON
        assert!(created.last_fetched_at.is_some()); // stamped because rank_tier present

        let all = list_players(&conn).unwrap();
        assert_eq!(all.len(), 1);

        let mut input = sample("Pudge", 6200);
        input.steam_name = "Pudge2".into();
        let updated = update_player(&conn, created.id, &input).unwrap();
        assert_eq!(updated.mmr, 6200);
        assert_eq!(updated.steam_name, "Pudge2");

        delete_player(&conn, created.id).unwrap();
        assert_eq!(list_players(&conn).unwrap().len(), 0);
    }

    #[test]
    fn set_active_toggles_flag() {
        let conn = mem();
        let p = create_player(&conn, &sample("Pudge", 5000)).unwrap();
        assert!(p.is_active); // active by default

        let off = set_player_active(&conn, p.id, false).unwrap();
        assert!(!off.is_active);
        assert!(!get_player(&conn, p.id).unwrap().unwrap().is_active);

        let on = set_player_active(&conn, p.id, true).unwrap();
        assert!(on.is_active);
    }

    #[test]
    fn players_sorted_by_mmr_desc() {
        let conn = mem();
        create_player(&conn, &sample("low", 1000)).unwrap();
        create_player(&conn, &sample("high", 9000)).unwrap();
        let players = list_players(&conn).unwrap();
        assert_eq!(players[0].steam_name, "high");
        assert_eq!(players[1].steam_name, "low");
    }

    #[test]
    fn import_replaces_all_data() {
        let mut conn = mem();
        create_player(&conn, &sample("Old", 1000)).unwrap(); // should be wiped

        let imported = Player {
            id: 42,
            account_id: None,
            steam_id64: None,
            steam_name: "New".into(),
            avatar_url: None,
            rank_tier: None,
            rank_label: None,
            mmr: 7000,
            discord_username: None,
            discord_url: None,
            discord_id: None,
            notes: None,
            roles: vec![2, 4],
            is_active: true,
            last_fetched_at: None,
            created_at: now(),
            updated_at: now(),
        };
        let board = BoardState {
            team_a: vec![Some(42), None, None, None, None],
            team_b: vec![None; 5],
        };
        let lobby = Lobby {
            region: "EU".into(),
            room_name: "room".into(),
            room_password: "pw".into(),
            discord_webhook: "hook".into(),
        };
        import_data(&mut conn, &[imported], &board, &lobby).unwrap();

        let all = list_players(&conn).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].id, 42); // id preserved so board stays valid
        assert_eq!(all[0].steam_name, "New");
        assert_eq!(all[0].roles, vec![2, 4]);
        assert_eq!(get_board(&conn).unwrap().team_a[0], Some(42));
        assert_eq!(get_lobby(&conn).unwrap().region, "EU");
    }

    #[test]
    fn board_defaults_and_persists() {
        let conn = mem();
        let board = get_board(&conn).unwrap();
        assert_eq!(board.team_a, vec![None; 5]);
        assert_eq!(board.team_b, vec![None; 5]);

        let a = vec![Some(1), None, Some(3), None, None];
        let b = vec![None, Some(2), None, None, Some(5)];
        save_board(&conn, &a, &b).unwrap();

        let reloaded = get_board(&conn).unwrap();
        assert_eq!(reloaded.team_a, a);
        assert_eq!(reloaded.team_b, b);
    }
}
