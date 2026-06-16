// Dota rank medal helpers. `rankTier` is a 2-digit number: tens = medal, ones = stars.
// Medal names use the official Russian Dota 2 localisation.

export const MEDAL_NAMES_RU = [
  "Без ранга",
  "Рекрут", // Herald
  "Страж", // Guardian
  "Рыцарь", // Crusader
  "Герой", // Archon
  "Легенда", // Legend
  "Властелин", // Ancient
  "Божество", // Divine
  "Иммортал", // Immortal
] as const;

// index 0 = unranked, 1..8 = Herald..Immortal
const COLORS = [
  "#6a7280", // unranked — slate
  "#9aa3ad", // Herald — grey
  "#7d9b63", // Guardian — moss
  "#54a35a", // Crusader — green
  "#3f93c4", // Archon — blue
  "#9a6fd0", // Legend — violet
  "#34b6a6", // Ancient — teal
  "#74c4ff", // Divine — sky
  "#f0b24a", // Immortal — gold
];

// Approximate MMR span per medal (5 medals worth of stars). Dota doesn't publish
// exact boundaries, but ~770 MMR per medal / ~154 per star is the common community
// approximation and matches the estimate the backend produces.
const MMR_PER_MEDAL = 770;
const MMR_PER_STAR = 154; // 770 / 5

/** Medal index (0 unranked, 1..8) from a rank tier. */
export function medalFromTier(rankTier?: number | null): number {
  if (!rankTier) return 0;
  const m = Math.floor(rankTier / 10);
  return m >= 1 && m <= 8 ? m : 0;
}

/** Stars (0..5) from a rank tier; 0 for Immortal / unranked. */
export function starsFromTier(rankTier?: number | null): number {
  const medal = medalFromTier(rankTier);
  if (medal < 1 || medal > 7) return 0;
  const s = (rankTier ?? 0) % 10;
  return s >= 1 && s <= 5 ? s : 0;
}

/** Ring/accent color for a rank tier. */
export function rankColor(rankTier?: number | null): string {
  return COLORS[medalFromTier(rankTier)] ?? COLORS[0];
}

/**
 * Derive a rank tier from an MMR value (the inverse of the estimate table).
 * e.g. 5000 -> 73 (Божество 3), 770 -> 21 (Страж 1), 6000 -> 80 (Иммортал).
 */
export function tierFromMmr(mmr?: number | null): number {
  const m = Math.max(0, Math.round(mmr ?? 0));
  const medal = Math.min(Math.floor(m / MMR_PER_MEDAL) + 1, 8);
  if (medal >= 8) return 80; // Immortal — no stars
  const offset = m - (medal - 1) * MMR_PER_MEDAL;
  const star = Math.min(Math.floor(offset / MMR_PER_STAR) + 1, 5);
  return medal * 10 + star;
}

/** Russian rank label from a tier, e.g. "Божество 4", "Иммортал", "Без ранга". */
export function formatRank(rankTier?: number | null): string {
  const medal = medalFromTier(rankTier);
  if (medal === 0) return MEDAL_NAMES_RU[0];
  const name = MEDAL_NAMES_RU[medal];
  if (medal === 8) return name; // Immortal
  const stars = starsFromTier(rankTier);
  return stars >= 1 ? `${name} ${stars}` : name;
}

/** Convenience: Russian rank label straight from an MMR value. */
export function rankLabelFromMmr(mmr?: number | null): string {
  return formatRank(tierFromMmr(mmr));
}
