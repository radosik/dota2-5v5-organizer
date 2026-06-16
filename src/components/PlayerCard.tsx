import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { openExternal } from "../lib/api";
import { formatRank, rankColor, tierFromMmr } from "../lib/rank";
import { cn, formatMmr } from "../lib/util";
import { useRoster } from "../store/roster";
import { t } from "../strings";
import type { Player } from "../types";
import { Avatar } from "./Avatar";
import { DiscordIcon, EditIcon, ExternalIcon, RefreshIcon, Spinner, TrashIcon } from "./Icons";
import { RankMedal } from "./RankMedal";

type Props = {
  player: Player;
  onEdit: (player: Player) => void;
};

const noDrag = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

export function PlayerCard({ player, onEdit }: Props) {
  const { setMmr, remove, refresh } = useRoster();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { playerId: player.id },
  });

  const [editingMmr, setEditingMmr] = useState(false);
  const [mmrDraft, setMmrDraft] = useState(String(player.mmr));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tier = tierFromMmr(player.mmr);
  const color = rankColor(tier);

  function commitMmr() {
    setEditingMmr(false);
    const value = parseInt(mmrDraft.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(value) && value !== player.mmr) setMmr(player.id, value);
    else setMmrDraft(String(player.mmr));
  }

  async function doRefresh() {
    setRefreshing(true);
    try {
      await refresh(player.id);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }

  const steamUrl = player.steamId64
    ? `https://steamcommunity.com/profiles/${player.steamId64}`
    : null;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative flex cursor-grab items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface-2 py-2.5 pl-4 pr-2.5 transition-all duration-150 hover:-translate-y-px hover:border-line-2 hover:bg-surface-3 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {/* rank accent strip */}
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: color, boxShadow: `0 0 12px ${color}66` }}
      />

      <Avatar name={player.steamName} avatarUrl={player.avatarUrl} rankTier={tier} size={42} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold leading-tight text-text">
            {player.steamName}
          </span>
          {steamUrl && (
            <button
              {...noDrag}
              onClick={() => openExternal(steamUrl)}
              className="text-faint opacity-0 transition hover:text-sky-300 group-hover:opacity-100"
              title={t.card.openSteam}
            >
              <ExternalIcon className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium" style={{ color }}>
            <RankMedal tier={tier} size={24} />
            {formatRank(tier)}
          </span>
          {player.discordUsername && (
            <span
              className="inline-flex min-w-0 items-center gap-1 text-[11px] text-faint"
              title={player.discordUsername}
            >
              <DiscordIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{player.discordUsername}</span>
            </span>
          )}
        </div>

        {player.roles?.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            {player.roles.map((r) => (
              <img
                key={r}
                src={`/roles/pos${r}.png`}
                alt={t.roles[r]}
                title={t.roles[r]}
                className="h-4 w-4 object-contain opacity-80"
              />
            ))}
          </div>
        )}
      </div>

      {/* MMR (click to edit) */}
      <div className="flex shrink-0 flex-col items-end">
        {editingMmr ? (
          <input
            {...noDrag}
            autoFocus
            value={mmrDraft}
            onChange={(e) => setMmrDraft(e.target.value)}
            onBlur={commitMmr}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitMmr();
              if (e.key === "Escape") {
                setMmrDraft(String(player.mmr));
                setEditingMmr(false);
              }
            }}
            className="field num w-[68px] px-1.5 py-0.5 text-right text-base text-gold-bright"
          />
        ) : (
          <button
            {...noDrag}
            onClick={() => {
              setMmrDraft(String(player.mmr));
              setEditingMmr(true);
            }}
            className="num text-lg font-semibold leading-none text-text transition hover:text-gold-bright"
            title={t.card.editMmr}
          >
            {formatMmr(player.mmr)}
          </button>
        )}
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-faint">{t.card.mmr}</span>
      </div>

      {/* hover actions: absolute overlay so they don't reserve width (MMR stays flush right) */}
      <div
        {...noDrag}
        className="absolute inset-y-0 right-0 z-10 flex items-center gap-0.5 rounded-r-xl bg-gradient-to-l from-surface-3 from-65% to-transparent pl-10 pr-2.5 opacity-0 transition group-hover:opacity-100"
      >
        {player.accountId != null && (
          <button
            {...noDrag}
            onClick={doRefresh}
            disabled={refreshing}
            className="rounded-md p-1.5 text-faint transition hover:bg-surface-4 hover:text-sky-300"
            title={t.card.refresh}
          >
            {refreshing ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <RefreshIcon className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          {...noDrag}
          onClick={() => onEdit(player)}
          className="rounded-md p-1.5 text-faint transition hover:bg-surface-4 hover:text-text"
          title={t.card.edit}
        >
          <EditIcon className="h-3.5 w-3.5" />
        </button>
        <button
          {...noDrag}
          onClick={() => setConfirmDelete(true)}
          className="rounded-md p-1.5 text-faint transition hover:bg-surface-4 hover:text-dire"
          title={t.card.delete}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {confirmDelete && (
        <div className="absolute inset-0 z-10 flex items-center justify-end gap-2 bg-surface-1/95 px-4 backdrop-blur-sm" {...noDrag}>
          <span className="mr-auto text-sm text-text">{t.card.confirmDelete}</span>
          <button
            onClick={() => {
              setConfirmDelete(false);
              remove(player.id);
            }}
            className="rounded-lg bg-dire px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
          >
            {t.card.delete}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg bg-surface-4 px-3 py-1.5 text-xs font-medium text-text transition hover:brightness-110"
          >
            {t.card.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
