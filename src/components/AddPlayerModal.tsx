import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { formatRank, rankColor, tierFromMmr } from "../lib/rank";
import { cn } from "../lib/util";
import { useRoster } from "../store/roster";
import { t } from "../strings";
import type { DotaSearchResult, Player, PlayerInput } from "../types";
import { Avatar } from "./Avatar";
import { SearchIcon, Spinner } from "./Icons";
import { Modal } from "./Modal";
import { RankMedal } from "./RankMedal";
import { RolePicker } from "./RolePicker";

/** Max size for a manually-uploaded avatar (stored inline as a data URL). */
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

type Props = {
  open: boolean;
  onClose: () => void;
  editing?: Player | null;
};

type FormState = {
  steamName: string;
  avatarUrl: string | null;
  accountId: number | null;
  steamId64: string | null;
  mmr: string;
  discordUsername: string;
  discordId: string;
  notes: string;
  roles: number[];
  isPrivate: boolean;
};

const emptyForm: FormState = {
  steamName: "",
  avatarUrl: null,
  accountId: null,
  steamId64: null,
  mmr: "0",
  discordUsername: "",
  discordId: "",
  notes: "",
  roles: [],
  isPrivate: false,
};

const fieldCls = "field w-full px-3 py-2 text-sm";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-faint";

function looksLikeId(s: string): boolean {
  const v = s.trim();
  return /^\d{6,}$/.test(v) || v.includes("steamcommunity.com");
}

export function AddPlayerModal({ open, onClose, editing }: Props) {
  const { add, update } = useRoster();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DotaSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSearchError(null);
    setSaveError(null);
    if (editing) {
      setForm({
        steamName: editing.steamName,
        avatarUrl: editing.avatarUrl,
        accountId: editing.accountId,
        steamId64: editing.steamId64,
        mmr: String(editing.mmr),
        discordUsername: editing.discordUsername ?? "",
        discordId: editing.discordId ?? "",
        notes: editing.notes ?? "",
        roles: editing.roles ?? [],
        isPrivate: false,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editing]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setSaveError(t.modal.avatarTooLarge);
      return;
    }
    setSaveError(null);
    const reader = new FileReader();
    reader.onload = () => set("avatarUrl", reader.result as string);
    reader.readAsDataURL(file);
  }

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearchError(null);
    setResults([]);

    if (looksLikeId(q)) {
      setLoadingProfile(true);
      try {
        const resolved = await api.resolveSteamInput(q);
        await loadProfile(resolved.accountId);
      } catch (e) {
        setSearchError(String(e));
      } finally {
        setLoadingProfile(false);
      }
      return;
    }

    setSearching(true);
    try {
      const found = await api.searchDotaPlayers(q);
      setResults(found.slice(0, 8));
      if (found.length === 0) setSearchError(t.modal.noResults);
    } catch (e) {
      setSearchError(String(e));
    } finally {
      setSearching(false);
    }
  }

  async function loadProfile(accountId: number) {
    setLoadingProfile(true);
    setSearchError(null);
    try {
      const p = await api.fetchDotaProfile(accountId);
      setForm((f) => ({
        ...f,
        steamName: p.personaName ?? f.steamName,
        avatarUrl: p.avatarFull,
        accountId: p.accountId,
        steamId64: p.steamId64,
        mmr: String(p.estimatedMmr),
        isPrivate: p.isPrivate,
      }));
      setResults([]);
    } catch (e) {
      setSearchError(String(e));
    } finally {
      setLoadingProfile(false);
    }
  }

  async function save() {
    setSaveError(null);
    const name = form.steamName.trim();
    if (!name) {
      setSaveError(t.modal.errNameRequired);
      return;
    }
    const mmr = parseInt(form.mmr.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(mmr)) {
      setSaveError(t.modal.errMmr);
      return;
    }

    const input: PlayerInput = {
      accountId: form.accountId,
      steamId64: form.steamId64,
      steamName: name,
      avatarUrl: form.avatarUrl,
      rankTier: tierFromMmr(mmr), // rank follows the entered MMR
      rankLabel: null,
      mmr,
      discordUsername: form.discordUsername.trim() || null,
      discordUrl: null,
      discordId: form.discordId.trim() || null,
      notes: form.notes.trim() || null,
      roles: form.roles,
    };

    setSaving(true);
    try {
      if (editing) await update(editing.id, input);
      else await add(input);
      onClose();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const tier = tierFromMmr(parseInt(form.mmr.replace(/[^0-9]/g, ""), 10) || 0);
  const busy = searching || loadingProfile;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t.modal.titleEdit : t.modal.titleAdd}
      widthClass="max-w-lg"
    >
      <div className="space-y-4">
        {/* Fill-from-Dota search row */}
        <div>
          <label className={labelCls}>{t.modal.searchLabel}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder={t.modal.searchPlaceholder}
                className="field w-full py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <button
              onClick={runSearch}
              disabled={busy || !query.trim()}
              className="btn-gold flex shrink-0 items-center justify-center rounded-lg px-4 text-sm disabled:opacity-50"
            >
              {busy ? <Spinner className="h-4 w-4 animate-spin" /> : t.modal.search}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-faint">{t.modal.searchHint}</p>
          {searchError && <p className="mt-1 text-xs text-dire">{searchError}</p>}

          {results.length > 0 && (
            <div className="mt-2 max-h-52 space-y-1.5 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.accountId}
                  onClick={() => loadProfile(r.accountId)}
                  disabled={loadingProfile}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-left transition hover:border-line-2 hover:bg-surface-3"
                >
                  <Avatar name={r.personaName ?? "?"} avatarUrl={r.avatarFull} size={34} ring={false} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{r.personaName ?? "—"}</div>
                    <div className="num text-xs text-faint">{t.modal.account(r.accountId)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-line" />

        {/* Player details */}
        {form.isPrivate && (
          <div className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold-bright">
            {t.modal.privateBanner}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            title={t.modal.avatarUpload}
            className="shrink-0 rounded-full ring-offset-2 ring-offset-surface-1 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Avatar name={form.steamName || "?"} avatarUrl={form.avatarUrl} rankTier={tier} size={56} />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={onAvatarFile}
            className="hidden"
          />
          <div className="flex-1">
            <label className={labelCls}>{t.modal.steamName}</label>
            <input
              value={form.steamName}
              onChange={(e) => set("steamName", e.target.value)}
              placeholder={t.modal.steamNamePlaceholder}
              className={fieldCls}
            />
            <div className="mt-1.5 flex items-center gap-3 text-[11px]">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="font-semibold text-gold-bright hover:underline"
              >
                {t.modal.avatarUpload}
              </button>
              {form.avatarUrl && (
                <button
                  type="button"
                  onClick={() => set("avatarUrl", null)}
                  className="text-faint hover:text-dire"
                >
                  {t.modal.avatarRemove}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>{t.modal.roles}</label>
          <RolePicker value={form.roles} onChange={(roles) => set("roles", roles)} />
          <p className="mt-1.5 text-[11px] text-faint">{t.modal.rolesHint}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t.modal.rank}</label>
            <div className="field flex h-[38px] items-center gap-2 px-2.5 text-sm">
              <RankMedal tier={tier} size={28} />
              <span style={{ color: rankColor(tier) }}>{formatRank(tier)}</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>{t.modal.mmrEditable}</label>
            <input
              value={form.mmr}
              onChange={(e) => set("mmr", e.target.value)}
              inputMode="numeric"
              placeholder={t.modal.mmrPlaceholder}
              className={cn(fieldCls, "num font-semibold text-gold-bright")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t.modal.discordName}</label>
            <input
              value={form.discordUsername}
              onChange={(e) => set("discordUsername", e.target.value)}
              placeholder={t.modal.discordNamePlaceholder}
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.modal.discordId}</label>
            <input
              value={form.discordId}
              onChange={(e) => set("discordId", e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder={t.modal.discordIdPlaceholder}
              className={cn(fieldCls, "num")}
            />
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-faint">{t.modal.discordIdHint}</p>

        <div>
          <label className={labelCls}>{t.modal.notes}</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder={t.modal.notesPlaceholder}
            className={cn(fieldCls, "resize-none")}
          />
        </div>

        {saveError && <p className="text-xs text-dire">{saveError}</p>}

        <div className="flex justify-end pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="btn-gold rounded-lg px-6 py-2 text-sm disabled:opacity-50"
          >
            {saving ? t.modal.saving : t.modal.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
