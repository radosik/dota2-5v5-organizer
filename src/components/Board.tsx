import { useMemo, useState } from "react";
import { useBoard } from "../store/board";
import { useRoster } from "../store/roster";
import { t } from "../strings";
import type { Accent, Player } from "../types";
import { BalanceMeter } from "./BalanceMeter";
import { CoinFlipModal } from "./CoinFlipModal";
import { CoinIcon, TrashIcon } from "./Icons";
import { LobbyBar } from "./LobbyBar";
import { TeamColumn } from "./TeamColumn";

const RADIANT: Accent = {
  ring: "border-radiant",
  text: "text-radiant",
  bg: "bg-radiant",
  band: "bg-gradient-to-r from-radiant/15 via-radiant/[0.06] to-transparent",
};
const DIRE: Accent = {
  ring: "border-dire",
  text: "text-dire",
  bg: "bg-dire",
  band: "bg-gradient-to-l from-dire/15 via-dire/[0.06] to-transparent",
};

function sumTeam(slots: (number | null)[], byId: Map<number, Player>): number {
  return slots.reduce<number>((acc, id) => acc + (id != null ? byId.get(id)?.mmr ?? 0 : 0), 0);
}

export function Board() {
  const [coinOpen, setCoinOpen] = useState(false);
  const teamA = useBoard((s) => s.teamA);
  const teamB = useBoard((s) => s.teamB);
  const clear = useBoard((s) => s.clear);
  const players = useRoster((s) => s.players);

  const playersById = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const sumA = useMemo(() => sumTeam(teamA, playersById), [teamA, playersById]);
  const sumB = useMemo(() => sumTeam(teamB, playersById), [teamB, playersById]);
  const hasAny = teamA.some((x) => x != null) || teamB.some((x) => x != null);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <LobbyBar />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-text">
            {t.board.title}
          </h2>
          <p className="text-xs text-faint">{t.board.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCoinOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10"
          >
            <CoinIcon className="h-3.5 w-3.5" /> {t.coin.button}
          </button>
          <button
            onClick={clear}
            disabled={!hasAny}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-3 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TrashIcon className="h-3.5 w-3.5" /> {t.board.clear}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-y-auto pb-1">
        <TeamColumn
          team="A"
          title={t.board.radiant}
          subtitle={t.board.teamA}
          slots={teamA}
          playersById={playersById}
          sum={sumA}
          accent={RADIANT}
        />
        <TeamColumn
          team="B"
          title={t.board.dire}
          subtitle={t.board.teamB}
          slots={teamB}
          playersById={playersById}
          sum={sumB}
          accent={DIRE}
        />
      </div>

      <div className="mt-4 shrink-0">
        <BalanceMeter sumA={sumA} sumB={sumB} />
      </div>

      <CoinFlipModal open={coinOpen} onClose={() => setCoinOpen(false)} />
    </div>
  );
}
