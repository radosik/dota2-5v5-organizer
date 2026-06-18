import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/util";
import { useRoster } from "../store/roster";
import { t } from "../strings";
import type { Player } from "../types";
import { PlayerCard } from "./PlayerCard";
import { SearchIcon, Spinner, UsersIcon } from "./Icons";

type Props = {
  onEdit: (player: Player) => void;
  onOpenAllPlayers: () => void;
  placedIds: Set<number>;
};

export function RosterPanel({ onEdit, onOpenAllPlayers, placedIds }: Props) {
  const { players, loading } = useRoster();
  const [filter, setFilter] = useState("");
  const { setNodeRef, isOver } = useDroppable({ id: "roster" });

  const available = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return players
      .filter((p) => p.isActive)
      .filter((p) => !placedIds.has(p.id))
      .filter((p) => !f || p.steamName.toLowerCase().includes(f));
  }, [players, placedIds, filter]);

  const activeCount = useMemo(() => players.filter((p) => p.isActive).length, [players]);
  const onBoard = placedIds.size;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl transition-colors",
        isOver && "border-radiant/50",
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <UsersIcon className="h-4 w-4 text-gold" />
        <h2 className="font-display text-base font-semibold uppercase tracking-wide text-text">
          {t.roster.title}
        </h2>
        <span className="num rounded-md bg-surface-3 px-1.5 py-0.5 text-xs text-muted">
          {activeCount}
        </span>
        {onBoard > 0 && (
          <span className="ml-auto text-xs text-faint">{t.roster.onBoard(onBoard)}</span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t.roster.filter}
            className="field w-full py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {loading && players.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-faint">
            <Spinner className="h-4 w-4 animate-spin" /> {t.roster.loading}
          </div>
        ) : available.length === 0 ? (
          <EmptyState
            total={players.length}
            activeCount={activeCount}
            filtered={filter.trim().length > 0}
          />
        ) : (
          <AnimatePresence initial={false}>
            {available.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
              >
                <PlayerCard player={p} onEdit={onEdit} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="border-t border-line p-3">
        <button
          onClick={onOpenAllPlayers}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line-2 bg-surface-2 py-2.5 text-sm font-semibold text-text transition hover:border-gold/40 hover:bg-surface-3"
        >
          <UsersIcon className="h-4 w-4 text-gold" />
          {t.roster.allPlayers}
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  total,
  activeCount,
  filtered,
}: {
  total: number;
  activeCount: number;
  filtered: boolean;
}) {
  const message = filtered
    ? t.roster.emptyFiltered
    : total === 0
      ? t.roster.emptyNone
      : activeCount === 0
        ? t.roster.emptyNoActive
        : t.roster.emptyAllPlaced;

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2">
        <UsersIcon className="h-6 w-6 text-faint" />
      </div>
      <p className="text-sm leading-relaxed text-muted">{message}</p>
    </div>
  );
}
