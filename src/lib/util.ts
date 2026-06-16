import { clsx, type ClassValue } from "clsx";
import type { Player, PlayerInput } from "../types";

/** Conditional className helper. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Project a saved Player back into the editable PlayerInput shape. */
export function playerToInput(p: Player): PlayerInput {
  return {
    accountId: p.accountId,
    steamId64: p.steamId64,
    steamName: p.steamName,
    avatarUrl: p.avatarUrl,
    rankTier: p.rankTier,
    rankLabel: p.rankLabel,
    mmr: p.mmr,
    discordUsername: p.discordUsername,
    discordUrl: p.discordUrl,
    discordId: p.discordId,
    notes: p.notes,
    roles: p.roles ?? [],
  };
}

/** Format an MMR / number with thousands separators (e.g. 27300 -> "27,300"). */
export function formatMmr(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Initials fallback for avatars (max 2 chars). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
