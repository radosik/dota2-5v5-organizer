import { cn } from "../lib/util";
import { t } from "../strings";

export const ROLES = [1, 2, 3, 4, 5] as const;

type Props = {
  value: number[];
  onChange: (roles: number[]) => void;
};

/** Five position squares (pos 1–5). Multi-select; "Все" toggles all on/off. */
export function RolePicker({ value, onChange }: Props) {
  const selected = new Set(value);
  const allOn = ROLES.every((r) => selected.has(r));

  function toggle(role: number) {
    const next = new Set(selected);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    onChange(ROLES.filter((r) => next.has(r)));
  }

  function toggleAll() {
    onChange(allOn ? [] : [...ROLES]);
  }

  return (
    <div className="flex items-center gap-2">
      {ROLES.map((role) => {
        const on = selected.has(role);
        return (
          <button
            key={role}
            type="button"
            onClick={() => toggle(role)}
            title={t.roles[role]}
            aria-pressed={on}
            aria-label={t.roles[role]}
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border transition",
              on
                ? "border-gold/70 bg-gold/15 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
                : "border-line bg-surface-2 hover:border-line-2 hover:bg-surface-3"
            )}
          >
            <img
              src={`/roles/pos${role}.png`}
              alt={t.roles[role]}
              className={cn(
                "h-7 w-7 object-contain transition",
                on ? "opacity-100" : "opacity-45 grayscale"
              )}
            />
            <span
              className={cn(
                "num absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold leading-none",
                on ? "bg-gold text-black" : "bg-surface-3 text-faint"
              )}
            >
              {role}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          "ml-1 h-12 shrink-0 rounded-lg border px-3 text-xs font-semibold transition",
          allOn
            ? "border-gold/70 bg-gold/15 text-gold-bright"
            : "border-line bg-surface-2 text-faint hover:border-line-2 hover:text-text"
        )}
      >
        {t.modal.rolesAll}
      </button>
    </div>
  );
}
