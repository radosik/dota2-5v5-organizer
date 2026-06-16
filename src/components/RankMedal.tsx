import { medalFromTier, starsFromTier } from "../lib/rank";

/**
 * Official Dota 2 seasonal rank medal (bundled in public/ranks/).
 * The image already includes the star count, so one asset per medal+stars.
 */
function rankIcon(tier?: number | null): string {
  const medal = medalFromTier(tier);
  if (medal === 0) return "/ranks/0-0.png"; // unranked
  if (medal === 8) return "/ranks/immortal.png"; // Immortal
  const stars = starsFromTier(tier) || 1;
  return `/ranks/${medal}-${stars}.png`;
}

type Props = { tier?: number | null; size?: number; className?: string };

export function RankMedal({ tier, size = 28, className }: Props) {
  return (
    <img
      src={rankIcon(tier)}
      width={size}
      height={size}
      draggable={false}
      alt=""
      aria-hidden
      className={className}
      style={{ objectFit: "contain", display: "inline-block", flexShrink: 0 }}
    />
  );
}
