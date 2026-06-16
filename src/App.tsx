import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AddPlayerModal } from "./components/AddPlayerModal";
import { Avatar } from "./components/Avatar";
import { Board } from "./components/Board";
import { PlusIcon } from "./components/Icons";
import { RosterPanel } from "./components/RosterPanel";
import { SendToDiscordButton } from "./components/SendToDiscordButton";
import { tierFromMmr } from "./lib/rank";
import { formatMmr } from "./lib/util";
import { useBoard } from "./store/board";
import { useRoster } from "./store/roster";
import { t } from "./strings";
import type { Player, TeamId } from "./types";

function App() {
  const loadRoster = useRoster((s) => s.load);
  const players = useRoster((s) => s.players);
  const loadBoard = useBoard((s) => s.load);
  const teamA = useBoard((s) => s.teamA);
  const teamB = useBoard((s) => s.teamB);
  const place = useBoard((s) => s.place);
  const removeFromBoard = useBoard((s) => s.remove);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    loadRoster();
    loadBoard();
  }, [loadRoster, loadBoard]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const playersById = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const placedIds = useMemo(() => {
    const s = new Set<number>();
    for (const x of teamA) if (x != null) s.add(x);
    for (const x of teamB) if (x != null) s.add(x);
    return s;
  }, [teamA, teamB]);

  function onDragStart(e: DragStartEvent) {
    setActiveId((e.active.data.current?.playerId as number | undefined) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const playerId = active.data.current?.playerId as number | undefined;
    if (playerId == null) return;
    if (over.id === "roster") {
      removeFromBoard(playerId);
      return;
    }
    const data = over.data.current as { team?: TeamId; slot?: number } | undefined;
    if (data?.team && typeof data.slot === "number") place(playerId, data.team, data.slot);
  }

  const activePlayer = activeId != null ? playersById.get(activeId) ?? null : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface-1/60 px-5 py-3 backdrop-blur">
          <SendToDiscordButton />

          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="btn-gold inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm"
          >
            <PlusIcon className="h-4 w-4" /> {t.app.addPlayer}
          </button>
        </header>

        <main className="grid flex-1 grid-cols-[minmax(320px,1fr)_2.1fr] gap-4 overflow-hidden p-4">
          <RosterPanel
            onEdit={(p) => {
              setEditing(p);
              setModalOpen(true);
            }}
            placedIds={placedIds}
          />
          <Board />
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePlayer ? (
          <div className="flex cursor-grabbing items-center gap-2.5 rounded-xl border border-gold/40 bg-surface-2 px-3 py-2 shadow-2xl">
            <Avatar
              name={activePlayer.steamName}
              avatarUrl={activePlayer.avatarUrl}
              rankTier={tierFromMmr(activePlayer.mmr)}
              size={36}
            />
            <div>
              <div className="text-sm font-semibold text-text">{activePlayer.steamName}</div>
              <div className="num text-xs font-semibold text-gold-bright">
                {formatMmr(activePlayer.mmr)} {t.app.mmr}
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      <AddPlayerModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </DndContext>
  );
}

export default App;
