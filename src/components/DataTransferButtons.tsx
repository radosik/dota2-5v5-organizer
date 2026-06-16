import { useRef, useState } from "react";
import { api } from "../lib/api";
import { useBoard } from "../store/board";
import { useLobby } from "../store/lobby";
import { useRoster } from "../store/roster";
import { t } from "../strings";
import type { ExportBundle } from "../types";
import { DownloadIcon, Spinner, UploadIcon } from "./Icons";
import { Modal } from "./Modal";

/** Shape check for an imported file before we trust it. */
function isBundle(v: unknown): v is ExportBundle {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  return Array.isArray(b.players) && typeof b.board === "object" && typeof b.lobby === "object";
}

export function DataTransferButtons() {
  const reloadRoster = useRoster((s) => s.load);
  const reloadBoard = useBoard((s) => s.load);
  const reloadLobby = useLobby((s) => s.load);

  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, setPending] = useState<ExportBundle | null>(null);

  function flash(text: string, ok: boolean) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), ok ? 6000 : 5000);
  }

  async function onExport() {
    setExporting(true);
    try {
      const path = await api.exportData();
      flash(t.data.exportedToast(path), true);
    } catch {
      flash(t.data.exportFailed, false);
    } finally {
      setExporting(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!isBundle(parsed)) throw new Error("bad shape");
        setPending(parsed);
      } catch {
        flash(t.data.importBadFile, false);
      }
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!pending) return;
    setImporting(true);
    try {
      await api.importData(pending);
      await Promise.all([reloadRoster(), reloadBoard(), reloadLobby()]);
      setPending(null);
    } catch {
      flash(t.data.importFailed, false);
    } finally {
      setImporting(false);
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-muted transition hover:border-line-2 hover:text-text disabled:opacity-50";

  return (
    <>
      <button onClick={onExport} disabled={exporting} className={btn} title={t.data.exportTitle}>
        {exporting ? <Spinner className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
        {t.data.export}
      </button>
      <button onClick={() => fileRef.current?.click()} className={btn} title={t.data.importTitle}>
        <UploadIcon className="h-4 w-4" />
        {t.data.import}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onPickFile}
        className="hidden"
      />

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-lg border px-4 py-2.5 text-sm shadow-2xl ${
            toast.ok
              ? "border-radiant/40 bg-surface-2 text-text"
              : "border-dire/50 bg-surface-2 text-dire"
          }`}
        >
          {toast.text}
        </div>
      )}

      <Modal open={!!pending} onClose={() => !importing && setPending(null)} title={t.data.importTitle}>
        <div className="space-y-4">
          <p className="text-sm text-text">{t.data.importPrompt}</p>
          <p className="text-sm text-muted">{t.data.importWarning}</p>
          {pending && (
            <p className="num text-xs text-faint">{t.data.importPlayers(pending.players.length)}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setPending(null)}
              disabled={importing}
              className="rounded-lg bg-surface-4 px-4 py-2 text-sm font-medium text-text transition hover:brightness-110 disabled:opacity-50"
            >
              {t.data.cancel}
            </button>
            <button
              onClick={confirmImport}
              disabled={importing}
              className="btn-gold rounded-lg px-5 py-2 text-sm disabled:opacity-50"
            >
              {importing ? t.data.importing : t.data.confirm}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
