import { useState } from "react";
import { getStoredTheme, setTheme, type Theme } from "../lib/theme";
import { MoonIcon, SunIcon } from "./Icons";

/** Header button that switches between the dark and light palettes. */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme());

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      title={dark ? "Светлая тема" : "Тёмная тема"}
      aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      className="rounded-lg border border-line-2 p-2 text-faint transition hover:bg-surface-3 hover:text-text"
    >
      {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
