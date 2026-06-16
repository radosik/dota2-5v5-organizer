import { useDraggable, useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { formatRank, rankColor, tierFromMmr } from "../lib/rank";
import { cn, formatMmr } from "../lib/util";
import { useBoard } from "../store/board";
import { t } from "../strings";
import type { Accent, Player, TeamId } from "../types";
import { Avatar } from "./Avatar";
import { PlusIcon, XIcon } from "./Icons";
import { RankMedal } from "./RankMedal";

type Props = {
  team: TeamId;
  slot: number;
  player: Player | null;
  accent: Accent;
};

const noDrag = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

export function Slot({ team, slot, player, accent }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${team}-${slot}`, data: { team, slot } });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-[58px] rounded-xl border transition-colors",
        player
          ? "border-line bg-surface-2"
          : isOver
            ? cn("border-2 border-dashed bg-surface-2/60", accent.ring)
            : "border-dashed border-line bg-surface-1/40",
      )}
    >
      {player ? (
        <motion.div
          key={player.id}
          className="h-full"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          <SlotCard team={team} slot={slot} player={player} />
        </motion.div>
      ) : (
        <div className="flex h-full items-center gap-2.5 px-3 text-faint">
          <span className="num flex h-6 w-6 items-center justify-center rounded-md border border-line text-xs">
            {slot + 1}
          </span>
          <PlusIcon className="h-3.5 w-3.5 opacity-60" />
          <span className="text-xs">{t.board.slot(slot + 1)}</span>
        </div>
      )}
    </div>
  );
}

function SlotCard({ team, slot, player }: { team: TeamId; slot: number; player: Player }) {
  const clearSlot = useBoard((s) => s.clearSlot);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { playerId: player.id },
  });
  const tier = tierFromMmr(player.mmr);
  const color = rankColor(tier);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative flex h-full cursor-grab items-center gap-2.5 overflow-hidden rounded-xl pl-3 pr-2.5 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
      <Avatar name={player.steamName} avatarUrl={player.avatarUrl} rankTier={tier} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-tight text-text">{player.steamName}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color }}>
          <RankMedal tier={tier} size={20} />
          {formatRank(tier)}
        </div>
      </div>
      <span className="num text-base font-semibold text-text">{formatMmr(player.mmr)}</span>
      <button
        {...noDrag}
        onClick={() => clearSlot(team, slot)}
        className="rounded-md p-1 text-faint opacity-0 transition hover:bg-surface-4 hover:text-dire group-hover:opacity-100"
        title={t.board.removeFromTeam}
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
