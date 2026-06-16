import { motion } from "framer-motion";
import { cn } from "../lib/util";
import { t } from "../strings";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = { sumA: number; sumB: number };

// Δ at or above this reads as "full" deflection on the meter.
const FULL_SCALE = 4000;

export function BalanceMeter({ sumA, sumB }: Props) {
  const diff = Math.abs(sumA - sumB);
  const radiantHeavier = sumA > sumB;
  const pct = Math.min(diff / FULL_SCALE, 1) * 50; // half-width max

  let tone: { text: string; status: string; fill: string };
  if (diff <= 500) {
    tone = { text: "text-radiant", status: t.balance.balanced, fill: "bg-radiant" };
  } else if (diff <= 1500) {
    tone = { text: "text-gold-bright", status: t.balance.slight, fill: "bg-gold" };
  } else {
    tone = { text: "text-dire", status: t.balance.unbalanced, fill: "bg-dire" };
  }

  const favour =
    diff === 0 ? t.balance.even : radiantHeavier ? t.balance.favouredRadiant : t.balance.favouredDire;

  // Fill extends from the center toward the heavier side.
  const fillStyle = radiantHeavier
    ? { left: `${50 - pct}%`, width: `${pct}%` }
    : { left: "50%", width: `${pct}%` };

  return (
    <div className="panel rounded-2xl px-5 py-3.5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-radiant">
          {t.board.radiant}
        </span>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-faint">{t.balance.title}</span>
          <span className={cn("num text-2xl font-bold leading-none", tone.text)}>
            <AnimatedNumber value={diff} />
          </span>
        </div>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-dire">
          {t.board.dire}
        </span>
      </div>

      {/* tug-of-war bar */}
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={cn("absolute inset-y-0 rounded-full", tone.fill)}
          initial={false}
          animate={fillStyle}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
        {/* center parity tick */}
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-2" />
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", tone.fill)} />
        <span className={cn("text-xs font-medium", tone.text)}>{tone.status}</span>
        <span className="text-xs text-faint">· {favour}</span>
      </div>
    </div>
  );
}
