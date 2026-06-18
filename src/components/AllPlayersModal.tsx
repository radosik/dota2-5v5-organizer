import { useMemo, useState } from "react";
import { useRoster } from "../store/roster";
import { t } from "../strings";
import type { Player } from "../types";
import { SearchIcon } from "./Icons";
import { Modal } from "./Modal";
import { PlayerCard } from "./PlayerCard";

type Props = {
  open: boolean;
  onClose: () => void;
  onEdit: (player: Player) => void;
};

/** Management view of EVERY player in the system: toggle online, edit, delete. */
export function AllPlayersModal({ open, onClose, onEdit }: Props) {
  const players = useRoster((s) => s.players);
  const [filter, setFilter] = useState("");

  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    // Online first, then by MMR (backend already sorts by MMR desc).
    return players
      .filter((p) => !f || p.steamName.toLowerCase().includes(f))
      .slice()
      .sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }, [players, filter]);

  const activeCount = players.filter((p) => p.isActive).length;

  return (
    <Modal open={open} onClose={onClose} title={t.allPlayers.title} widthClass="max-w-xl">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-xs text-faint">{t.allPlayers.subtitle}</p>
          <span className="num rounded-md bg-surface-3 px-1.5 py-0.5 text-xs text-muted">
            {t.allPlayers.count(players.length)}
          </span>
          <span className="num rounded-md bg-radiant/15 px-1.5 py-0.5 text-xs text-radiant">
            {t.allPlayers.active(activeCount)}
          </span>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t.allPlayers.filter}
            className="field w-full py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="-mr-1 max-h-[56vh] space-y-2 overflow-y-auto pr-1">
          {list.length === 0 ? (
            <p className="py-12 text-center text-sm text-faint">
              {players.length ? t.allPlayers.empty : t.allPlayers.emptyNone}
            </p>
          ) : (
            list.map((p) => <PlayerCard key={p.id} player={p} onEdit={onEdit} mode="manage" />)
          )}
        </div>
      </div>
    </Modal>
  );
}
