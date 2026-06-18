export type Theme = "dark" | "light";

const KEY = "theme";

/** Read the persisted theme (defaults to dark). */
export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Toggle the `light` class on <html> to switch palettes. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("light", theme === "light");
}

/** Persist and apply a theme. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore storage errors */
  }
  applyTheme(theme);
}
