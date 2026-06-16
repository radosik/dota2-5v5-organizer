# Dota 2 — 5v5 Custom Lobby Organizer

A small, fast desktop app for organizing balanced **5-vs-5 Dota 2 inhouse games**.
Build a roster of players (auto-pulling their Steam avatar + Dota rank from
OpenDota), drag them into two teams, and see each team's **total MMR** and the
**difference** update live so you can balance the lobby.

> Built with **Tauri 2 + React + TypeScript** (tiny native `.exe`), a **Rust**
> backend, **SQLite** storage, and the keyless **OpenDota** API.

---

## Features

- 🔎 **Add players by Steam name** (or SteamID / numeric profile URL) — picks the
  right account from a list of avatars via OpenDota search.
- 🖼️ **Auto-fetch** Steam avatar, persona name, and **rank medal** (e.g. "Divine 4").
- 🎚️ **Editable MMR** — pre-filled from the rank medal, then yours to adjust
  (Valve no longer exposes exact MMR publicly; see note below).
- 💬 **Clickable Discord** chip and Steam profile link (open in your browser).
- 🗂️ **Persistent roster** stored locally in SQLite — reuse players across games.
- 🟢🔴 **Drag-and-drop 5v5 board** with live **Σ MMR per team** and a Δ balance
  badge (green = balanced, amber = slight edge, red = unbalanced).
- 💾 Board arrangement persists across restarts.

---

## Quick start (development)

**Prerequisites:** [Node.js](https://nodejs.org) 18+ and the
[Rust toolchain](https://rustup.rs). On Windows also install the
[WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/)
(preinstalled on Windows 11) and the MSVC build tools.

```bash
npm install
npm run tauri dev      # launches the app with hot reload
```

## Building a distributable

```bash
npm run tauri build
```

Artifacts land in `src-tauri/target/release/bundle/`.

- **macOS:** `.app` / `.dmg`
- **Windows:** `.exe` (NSIS installer) + `.msi`

> ⚠️ **Windows `.exe` must be built on Windows.** Tauri does not reliably
> cross-compile to Windows from macOS/Linux. Use a Windows machine **or** the
> included GitHub Actions workflow:
>
> - Push a tag `vX.Y.Z` → builds and drafts a Release with the installer.
> - Or run the **“Build Windows app”** workflow manually → download the installer
>   from the run's **Artifacts**.
>
> (Requires pushing this project to a GitHub repo so Actions can run.)

---

## How it works

| Layer        | Tech                                   |
| ------------ | -------------------------------------- |
| Shell / exe  | Tauri 2                                |
| UI           | React 18 + TypeScript + Vite           |
| Styling      | Tailwind CSS v4                        |
| Animation    | Framer Motion                          |
| Drag & drop  | @dnd-kit                               |
| State        | Zustand                                |
| Backend      | Rust (Tauri commands)                  |
| Database     | SQLite (rusqlite, bundled)             |
| Data source  | [OpenDota API](https://docs.opendota.com) (keyless) |

The Rust backend owns the SQLite database and all OpenDota HTTP calls (no CORS,
clean separation); the React frontend talks to it through typed `invoke()`
wrappers. See [`PLAN.md`](PLAN.md) for the full architecture and design.

### Where is my data stored?

A local SQLite file in the OS app-data directory:

- **Windows:** `%APPDATA%\com.rados1k.dota5v5\dota5v5.db`
- **macOS:** `~/Library/Application Support/com.rados1k.dota5v5/dota5v5.db`

### Note on MMR & rank

Valve **no longer exposes a player's exact MMR number** through any public API.
This app fetches the **rank medal** automatically and pre-fills an **MMR
estimate** from it — the stored MMR value is always **editable**, so set it to the
real number when you know it. Players must have a **public Dota match-data
profile** for avatar/rank to resolve; otherwise use **“Enter manually”**.

---

## Tests

```bash
cargo test --manifest-path src-tauri/Cargo.toml      # rank decode, MMR estimate, SteamID math, DB CRUD
npm run build                                        # typecheck + frontend build
```

## Credits

- Player data via the free [OpenDota API](https://www.opendota.com).
- Rank medal icons (`public/ranks/`) are © Valve Corporation, from Dota 2, used
  here for their in-game purpose in a non-commercial fan tool.

Not affiliated with or endorsed by Valve or OpenDota.
