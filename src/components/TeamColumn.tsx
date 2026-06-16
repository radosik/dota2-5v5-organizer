import { cn, formatMmr } from "../lib/util";
import { t } from "../strings";
import type { Accent, Player, TeamId } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";
import { Slot } from "./Slot";

type Props = {
  team: TeamId;
  title: string;
  subtitle: string;
  slots: (number | null)[];
  playersById: Map<number, Player>;
  sum: number;
  accent: Accent;
};

export function TeamColumn({ team, title, subtitle, slots, playersById, sum, accent }: Props) {
  const filled = slots.filter((x) => x != null).length;
  const avg = filled > 0 ? Math.round(sum / filled) : 0;

  return (
    <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
      {/* team header band */}
      <div className={cn("relative flex items-center gap-2.5 px-4 py-3", accent.band)}>
        <span className={cn("h-7 w-1 rounded-full", accent.bg)} />
        <div className="leading-none">
          <h3 className={cn("font-display text-xl font-bold uppercase leading-none", accent.text)}>
            {title}
          </h3>
          <span className="text-[11px] uppercase tracking-wide text-faint">{subtitle}</span>
        </div>
        <span className="num ml-auto text-sm text-muted">{filled}/5</span>
      </div>

      <div className="space-y-2 px-3 py-3">
        {slots.map((pid, i) => (
          <Slot
            key={i}
            team={team}
            slot={i}
            player={pid != null ? playersById.get(pid) ?? null : null}
            accent={accent}
          />
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between border-t border-line px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-faint">{t.board.teamMmr}</span>
          <span className="num text-2xl font-bold leading-none text-text">
            <AnimatedNumber value={sum} />
          </span>
        </div>
        <span className="num text-xs text-faint">
          {t.board.avg} {formatMmr(avg)}
        </span>
      </div>
    </div>
  );
}
