import { rankColor } from "../lib/rank";
import { initials } from "../lib/util";

type Props = {
  name: string;
  avatarUrl?: string | null;
  rankTier?: number | null;
  size?: number;
  ring?: boolean;
};

/** Circular avatar with a rank-medal-colored gradient ring. */
export function Avatar({ name, avatarUrl, rankTier, size = 44, ring = true }: Props) {
  const color = rankColor(rankTier);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="h-full w-full rounded-full p-[2px]"
        style={{
          background: ring ? `linear-gradient(155deg, ${color}, ${color}55)` : "transparent",
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            draggable={false}
            className="h-full w-full rounded-full bg-surface-3 object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-muted">
            {initials(name)}
          </div>
        )}
      </div>
    </div>
  );
}
