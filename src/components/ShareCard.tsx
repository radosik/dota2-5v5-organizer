import { rankColor, tierFromMmr } from "../lib/rank";
import { formatMmr } from "../lib/util";
import { t } from "../strings";
import type { Player } from "../types";
import { RankMedal } from "./RankMedal";

type Props = {
  roomName: string;
  region: string;
  teamA: Player[];
  teamB: Player[];
  sumA: number;
  sumB: number;
};

/** Presentational lineup card sized for export to a PNG (matches the app style). */
export function ShareCard({ roomName, region, teamA, teamB, sumA, sumB }: Props) {
  const diff = Math.abs(sumA - sumB);
  const balance =
    diff <= 500 ? t.balance.balanced : diff <= 1500 ? t.balance.slight : t.balance.unbalanced;
  const diffColor = diff <= 500 ? "#46c47a" : diff <= 1500 ? "#f1d493" : "#e25a52";

  return (
    <div
      style={{ width: 720 }}
      className="bg-base p-6 font-sans text-text"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-gold-bright">
          {roomName.trim() || "Инхаус 5×5"}
        </h1>
        {region.trim() && <span className="text-sm text-muted">{region.trim()}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TeamBlock
          title={t.board.radiant}
          accent="#46c47a"
          band="linear-gradient(90deg, rgba(74,201,138,0.18), transparent)"
          players={teamA}
          sum={sumA}
        />
        <TeamBlock
          title={t.board.dire}
          accent="#e25a52"
          band="linear-gradient(270deg, rgba(226,90,82,0.18), transparent)"
          players={teamB}
          sum={sumB}
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-line bg-surface-1 py-2.5">
        <span className="text-[11px] uppercase tracking-wider text-faint">{t.balance.title}</span>
        <span className="num text-xl font-bold" style={{ color: diffColor }}>
          {formatMmr(diff)}
        </span>
        <span className="text-sm font-medium" style={{ color: diffColor }}>
          {balance}
        </span>
      </div>
    </div>
  );
}

function TeamBlock({
  title,
  accent,
  band,
  players,
  sum,
}: {
  title: string;
  accent: string;
  band: string;
  players: Player[];
  sum: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-1">
      <div className="flex items-center justify-between px-3 py-2" style={{ background: band }}>
        <span className="font-display text-lg font-bold uppercase" style={{ color: accent }}>
          {title}
        </span>
        <span className="num text-lg font-bold text-text">{formatMmr(sum)}</span>
      </div>
      <div className="space-y-1.5 p-2.5">
        {players.length === 0 ? (
          <div className="px-1 py-3 text-center text-xs text-faint">—</div>
        ) : (
          players.map((p) => {
            const tier = tierFromMmr(p.mmr);
            return (
              <div key={p.id} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-2.5 py-1.5">
                <RankMedal tier={tier} size={26} />
                <span className="flex-1 truncate text-sm font-semibold text-text">{p.steamName}</span>
                <span className="num text-sm font-semibold" style={{ color: rankColor(tier) }}>
                  {formatMmr(p.mmr)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
