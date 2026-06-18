import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../lib/api";
import { buildDiscordContent, captureToBase64 } from "../lib/share";
import { cn } from "../lib/util";
import { useBoard } from "../store/board";
import { useLobby } from "../store/lobby";
import { useRoster } from "../store/roster";
import { t } from "../strings";
import type { Player } from "../types";
import { DiscordSettingsModal } from "./DiscordSettingsModal";
import { DiscordIcon, SettingsIcon, Spinner } from "./Icons";
import { Modal } from "./Modal";
import { ShareCard } from "./ShareCard";

function resolveTeam(ids: (number | null)[], byId: Map<number, Player>): Player[] {
  const out: Player[] = [];
  for (const id of ids) {
    if (id != null) {
      const p = byId.get(id);
      if (p) out.push(p);
    }
  }
  return out;
}

export function SendToDiscordButton() {
  const teamAIds = useBoard((s) => s.teamA);
  const teamBIds = useBoard((s) => s.teamB);
  const players = useRoster((s) => s.players);
  const { region, roomName, roomPassword, discordWebhook } = useLobby();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const teamA = useMemo(() => resolveTeam(teamAIds, byId), [teamAIds, byId]);
  const teamB = useMemo(() => resolveTeam(teamBIds, byId), [teamBIds, byId]);
  const sumA = teamA.reduce((acc, p) => acc + p.mmr, 0);
  const sumB = teamB.reduce((acc, p) => acc + p.mmr, 0);

  // Exactly the placed players who will be @-mentioned (have a valid Discord ID).
  const pingTargets = useMemo(
    () => [...teamA, ...teamB].filter((p) => !!p.discordId && /^\d{5,}$/.test(p.discordId)),
    [teamA, teamB],
  );
  // Same Discord ID on more than one placed player = the same person twice.
  const hasDuplicatePing = useMemo(() => {
    const ids = pingTargets.map((p) => p.discordId);
    return new Set(ids).size !== ids.length;
  }, [pingTargets]);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function openConfirm() {
    if (!discordWebhook.trim()) {
      showToast(false, t.discord.noWebhook);
      setSettingsOpen(true);
      return;
    }
    setConfirmOpen(true);
  }

  async function send() {
    setConfirmOpen(false);
    setSending(true);
    try {
      const img = cardRef.current ? await captureToBase64(cardRef.current) : "";
      const { content, userIds } = buildDiscordContent({
        roomName,
        region,
        password: roomPassword,
        players: [...teamA, ...teamB],
      });
      await api.sendToDiscord(content, userIds, img);
      showToast(true, t.discord.sent);
    } catch (e) {
      showToast(false, `${t.discord.failed}: ${String(e)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={openConfirm}
        disabled={sending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
      >
        {sending ? <Spinner className="h-4 w-4 animate-spin" /> : <DiscordIcon className="h-4 w-4" />}
        {sending ? t.discord.sending : t.app.sendToDiscord}
      </button>
      <button
        onClick={() => setSettingsOpen(true)}
        title={t.discord.settings}
        className="rounded-lg border border-line-2 p-2 text-faint transition hover:bg-surface-3 hover:text-text"
      >
        <SettingsIcon className="h-4 w-4" />
      </button>

      {/* Offscreen lineup card used only for PNG rasterization */}
      <div
        className="theme-dark"
        style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}
        aria-hidden
      >
        <div ref={cardRef}>
          <ShareCard
            roomName={roomName}
            region={region}
            teamA={teamA}
            teamB={teamB}
            sumA={sumA}
            sumB={sumB}
          />
        </div>
      </div>

      <DiscordSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t.discord.confirmTitle}>
        <div className="space-y-4">
          {pingTargets.length > 0 ? (
            <>
              <p className="text-sm text-text">{t.discord.confirmPingIntro(pingTargets.length)}</p>
              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-line bg-surface-2 p-2">
                {pingTargets.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm"
                  >
                    <span className="truncate text-text">{p.steamName}</span>
                    <span className="num shrink-0 text-xs text-faint">{p.discordId}</span>
                  </li>
                ))}
              </ul>
              {hasDuplicatePing && (
                <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold-bright">
                  {t.discord.confirmDupWarning}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">{t.discord.confirmNoPing}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setConfirmOpen(false)}
              className="rounded-lg bg-surface-4 px-4 py-2 text-sm font-medium text-text transition hover:brightness-110"
            >
              {t.discord.cancel}
            </button>
            <button
              onClick={send}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              <DiscordIcon className="h-4 w-4" /> {t.discord.confirmSend}
            </button>
          </div>
        </div>
      </Modal>

      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className={cn(
                "fixed bottom-5 left-1/2 z-[60] max-w-[80vw] -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-2xl",
                toast.ok
                  ? "border-radiant/40 bg-radiant/15 text-radiant"
                  : "border-dire/40 bg-dire/15 text-dire",
              )}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
