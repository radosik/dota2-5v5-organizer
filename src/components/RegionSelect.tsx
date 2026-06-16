import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/util";
import { t } from "../strings";
import { SearchIcon } from "./Icons";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
};

/** A searchable single-select combobox (filter as you type). */
export function RegionSelect({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className={cn(
          "field flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
          !value && "text-faint",
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <span className="shrink-0 text-xs text-faint">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-line-2 bg-surface-2 shadow-2xl">
          <div className="relative border-b border-line p-1.5">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && filtered.length > 0) pick(filtered[0]);
              }}
              placeholder={t.lobby.regionSearch}
              className="w-full rounded-md bg-base py-1.5 pl-8 pr-2 text-sm text-text outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {value && (
              <button
                type="button"
                onClick={() => pick("")}
                className="block w-full px-3 py-1.5 text-left text-xs text-faint transition hover:bg-surface-3"
              >
                {t.lobby.regionClear}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-faint">{t.lobby.regionEmpty}</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => pick(o)}
                  className={cn(
                    "block w-full truncate px-3 py-1.5 text-left text-sm transition hover:bg-surface-3",
                    o === value ? "text-gold" : "text-text",
                  )}
                >
                  {o}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
