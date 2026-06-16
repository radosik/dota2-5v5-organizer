// TypeScript mirrors of the Rust serde structs (camelCase). Keep in sync with
// src-tauri/src/models.rs.

export interface Player {
  id: number;
  accountId: number | null;
  steamId64: string | null;
  steamName: string;
  avatarUrl: string | null;
  rankTier: number | null;
  rankLabel: string | null;
  mmr: number;
  discordUsername: string | null;
  discordUrl: string | null;
  discordId: string | null;
  notes: string | null;
  lastFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerInput {
  accountId: number | null;
  steamId64: string | null;
  steamName: string;
  avatarUrl: string | null;
  rankTier: number | null;
  rankLabel: string | null;
  mmr: number;
  discordUsername: string | null;
  discordUrl: string | null;
  discordId: string | null;
  notes: string | null;
}

export interface DotaSearchResult {
  accountId: number;
  personaName: string | null;
  avatarFull: string | null;
  lastMatchTime: string | null;
  similarity: number | null;
}

export interface DotaProfile {
  accountId: number;
  steamId64: string;
  personaName: string | null;
  avatarFull: string | null;
  profileUrl: string | null;
  rankTier: number | null;
  leaderboardRank: number | null;
  rankLabel: string | null;
  estimatedMmr: number;
  isPrivate: boolean;
}

export interface ResolvedSteamId {
  accountId: number;
  steamId64: string;
}

export interface BoardState {
  teamA: (number | null)[];
  teamB: (number | null)[];
}

export interface Lobby {
  region: string;
  roomName: string;
  roomPassword: string;
  discordWebhook: string;
}

export type TeamId = "A" | "B";
export const TEAM_SIZE = 5;

/** Per-team visual accent (Radiant green / Dire red). */
export type Accent = { ring: string; text: string; bg: string; band: string };
