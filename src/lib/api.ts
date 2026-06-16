import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type {
  BoardState,
  DotaProfile,
  DotaSearchResult,
  ExportBundle,
  Lobby,
  Player,
  PlayerInput,
  ResolvedSteamId,
} from "../types";

/** Thin, typed wrappers around the Rust Tauri commands. */
export const api = {
  // Player CRUD
  listPlayers: () => invoke<Player[]>("list_players"),
  getPlayer: (id: number) => invoke<Player | null>("get_player", { id }),
  createPlayer: (input: PlayerInput) => invoke<Player>("create_player", { input }),
  updatePlayer: (id: number, input: PlayerInput) =>
    invoke<Player>("update_player", { id, input }),
  deletePlayer: (id: number) => invoke<void>("delete_player", { id }),

  // Board
  getBoard: () => invoke<BoardState>("get_board"),
  saveBoard: (teamA: (number | null)[], teamB: (number | null)[]) =>
    invoke<void>("save_board", { teamA, teamB }),

  // Lobby
  getLobby: () => invoke<Lobby>("get_lobby"),
  saveLobby: (region: string, roomName: string, roomPassword: string, discordWebhook: string) =>
    invoke<void>("save_lobby", { region, roomName, roomPassword, discordWebhook }),

  // Data export / import
  exportData: () => invoke<string>("export_data"),
  importData: (bundle: ExportBundle) => invoke<void>("import_data", { bundle }),

  // Discord
  sendToDiscord: (content: string, userIds: string[], imageBase64: string) =>
    invoke<void>("send_to_discord", { content, userIds, imageBase64 }),

  // Helpers
  resolveSteamInput: (raw: string) =>
    invoke<ResolvedSteamId>("resolve_steam_input", { raw }),
  estimateMmrFromRank: (rankTier: number | null, leaderboardRank: number | null) =>
    invoke<number>("estimate_mmr_from_rank", { rankTier, leaderboardRank }),

  // OpenDota
  searchDotaPlayers: (query: string) =>
    invoke<DotaSearchResult[]>("search_dota_players", { query }),
  fetchDotaProfile: (accountId: number) =>
    invoke<DotaProfile>("fetch_dota_profile", { accountId }),
  refreshPlayerFromDota: (id: number) =>
    invoke<Player>("refresh_player_from_dota", { id }),
};

/** Open an external link in the user's default browser/app. */
export async function openExternal(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    // Fallback for non-Tauri / dev contexts.
    window.open(url, "_blank");
  }
}
