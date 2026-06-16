import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../lib/util";
import { useLobby } from "../store/lobby";
import { REGIONS, t } from "../strings";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, GlobeIcon } from "./Icons";
import { RegionSelect } from "./RegionSelect";

export function LobbyBar() {
  const { region, roomName, roomPassword, update, load } = useLobby();
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  function copyPw() {
    if (!roomPassword || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(roomPassword)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
  }

  return (
    <div className="panel relative z-30 mb-4 shrink-0 rounded-2xl px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex h-[38px] items-center gap-2 pr-1">
          <GlobeIcon className="h-4 w-4 text-gold" />
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-text">
            {t.lobby.title}
          </span>
        </div>

        <Labeled label={t.lobby.region} className="min-w-[200px] flex-1">
          <RegionSelect
            value={region}
            onChange={(v) => update({ region: v })}
            options={REGIONS}
            placeholder={t.lobby.regionNone}
          />
        </Labeled>

        <Labeled label={t.lobby.roomName} className="min-w-[160px] flex-1">
          <input
            value={roomName}
            onChange={(e) => update({ roomName: e.target.value })}
            placeholder={t.lobby.roomNamePlaceholder}
            className="field w-full px-3 py-2 text-sm"
          />
        </Labeled>

        <Labeled label={t.lobby.password} className="min-w-[180px] flex-1">
          <div className="relative">
            <input
              value={roomPassword}
              onChange={(e) => update({ roomPassword: e.target.value })}
              type={showPw ? "text" : "password"}
              placeholder={t.lobby.passwordPlaceholder}
              className="field w-full px-3 py-2 pr-16 text-sm"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                title={showPw ? t.lobby.hide : t.lobby.show}
                className="rounded p-1 text-faint transition hover:text-text"
              >
                {showPw ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={copyPw}
                title={copied ? t.lobby.copied : t.lobby.copy}
                className={cn(
                  "rounded p-1 transition",
                  copied ? "text-radiant" : "text-faint hover:text-text",
                )}
              >
                {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </Labeled>
      </div>
    </div>
  );
}

function Labeled({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}
