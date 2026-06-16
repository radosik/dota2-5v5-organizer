# Dota 2 — 5v5 Custom Lobby Organizer

> A desktop app (`.exe`) for organizing balanced 5-vs-5 Dota 2 custom games.
> Build a roster of players, auto-pull their Steam avatar + rank from OpenDota,
> drag them into team slots, and see each team's total MMR live so games are easy to balance.

This document is the **single source of truth**. An AI/engineer should be able to
execute it top-to-bottom and ship a finished app. Each phase has a goal, concrete
steps, and **acceptance criteria** (✅ checkboxes). Do not move to the next phase
until the current one's acceptance criteria pass.

> ## ✅ Build status — implemented
> All phases are built and verified. The app compiles (frontend + Rust), boots,
> creates its SQLite database, and 6 backend tests pass (rank decode, MMR
> estimate, SteamID math, DB CRUD). See [`README.md`](README.md) to run it.
> **Only remaining item:** building/running the Windows `.exe` itself — do this on
> Windows or via the included GitHub Actions workflow (`.github/workflows/build.yml`),
> since Tauri can't cross-compile to Windows from macOS.

---

## 0. Product Summary

**The problem:** Organizing 5v5 inhouse Dota games means juggling who plays, their
skill (MMR), and contacting them. Right now this lives in someone's head or a Discord message.

**The solution:** A native desktop app where you:
1. Save players once (Steam name/ID → auto-fetch avatar + rank, manually set MMR, add Discord).
2. Keep them in a reusable roster.
3. Drag players into two teams of 5.
4. See each team's **summed MMR** and the **difference** in real time, so you can balance fairly.

**Explicitly out of scope (for v1):** We do **not** read live game state, inject into
the Dota client, or automate the in-game lobby. We only *store and organize* info.

---

## 1. Tech Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Shell / packaging | **Tauri 2.x** | Tiny `.exe` (~5–10 MB), native, secure, Rust backend |
| Frontend | **React 18 + TypeScript + Vite** | Component-driven fancy UI |
| Styling | **Tailwind CSS** + **shadcn/ui** | Fast, consistent, polished components |
| Animation | **Framer Motion** | Smooth card/slot transitions (a project skill exists for this) |
| Drag & drop | **@dnd-kit/core** | Best-in-class React DnD, accessible |
| State | **Zustand** | Lightweight global store for roster + board |
| Backend logic | **Rust (Tauri commands)** | DB + HTTP calls run in Rust → no CORS, clean separation |
| Database | **SQLite** via **rusqlite** | Local, persistent, queryable roster |
| HTTP client | **reqwest** (Rust) | Calls OpenDota from backend |
| Data source | **OpenDota API** (keyless) | Avatar, persona name, rank medal — no API key needed |

> **Dev note:** Development can happen on macOS/Linux, but the final **`.exe` must be
> built on Windows** (or via a Windows CI runner / GitHub Actions). Tauri does not
> reliably cross-compile to Windows from macOS. See Phase 7.

---

## 2. ⚠️ Critical Reality: MMR & Rank Data

Read this before coding the data layer — it shapes the whole model.

- **Valve does NOT expose a player's exact MMR number** through any public API anymore.
- What OpenDota **can** give us automatically:
  - `profile.avatarfull` — avatar image URL
  - `profile.personaname` — Steam display name
  - `profile.profileurl` — Steam profile link
  - `rank_tier` — encoded rank medal (e.g. Divine 3, Ancient 5)
  - `leaderboard_rank` — only for Immortal top players
- Therefore: **`rank_tier` is fetched automatically**, but the **MMR number is
  manually entered/editable** by the user. We pre-fill an *estimate* from the rank
  medal so the user just tweaks it.

### `rank_tier` decoding
`rank_tier` is a 2-digit number: `tens digit = medal`, `ones digit = stars (1–5)`.

| Medal digit | Name | Approx MMR (for estimate pre-fill) |
|---|---|---|
| 1 | Herald | 0–760 |
| 2 | Guardian | 770–1540 |
| 3 | Crusader | 1540–2300 |
| 4 | Archon | 2300–3080 |
| 5 | Legend | 3080–3850 |
| 6 | Ancient | 3850–4620 |
| 7 | Divine | 4620–5420 |
| 8 | Immortal | 5420+ (use leaderboard_rank if present) |

Estimate rule: `estimateMmr = (medal-1)*770 + (stars-1)*ceil(770/5)` (clamped, Immortal = 5500 baseline).
This is **only a pre-fill**; the stored `mmr` field is authoritative and user-editable.

---

## 3. OpenDota API Integration Reference

Base URL: `https://api.opendota.com/api`
No key required. Be polite: rate-limit to ~1 req/sec, cache results.

### 3.1 SteamID math
OpenDota uses the **32-bit account_id**, not SteamID64.
```
account_id = steamID64 - 76561197960265728
steamID64  = account_id + 76561197960265728
```
Accept any of these as user input and normalize:
- A raw `account_id` (e.g. `123456789`)
- A `steamID64` (17 digits, e.g. `76561198...`)
- A full profile URL `https://steamcommunity.com/profiles/{steamID64}`
- (Vanity URLs like `/id/customname` **cannot** be resolved by OpenDota — see search below.)

### 3.2 Search by Steam name (key feature)
`GET /search?q={personaname}` → returns array of candidates:
```json
[{ "account_id": 123, "personaname": "Dendi", "avatarfull": "https://...", "last_match_time": "..." }]
```
Use this to let the user **type a Steam name → pick the right person from a list of
avatars** instead of needing the numeric ID.

### 3.3 Fetch full player
`GET /players/{account_id}` →
```json
{
  "profile": {
    "account_id": 123,
    "personaname": "Dendi",
    "avatarfull": "https://...",
    "profileurl": "https://steamcommunity.com/id/dendi/"
  },
  "rank_tier": 74,
  "leaderboard_rank": null
}
```
> If `profile` is `null`, the player's Dota profile is **private/unexposed** — handle
> gracefully (allow saving with manual data only).

### 3.4 Backend caching
Cache OpenDota responses for ~24h (store `last_fetched_at` on the player row). Add a
manual "Refresh from Dota" button per player.

---

## 4. Data Model (SQLite)

### `players` table
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | internal id |
| `account_id` | INTEGER NULL UNIQUE | Dota 32-bit id (nullable for manual-only players) |
| `steam_id64` | TEXT NULL | stored as text (big number) |
| `steam_name` | TEXT NOT NULL | persona name (editable) |
| `avatar_url` | TEXT NULL | from OpenDota; fallback to default avatar |
| `rank_tier` | INTEGER NULL | raw OpenDota rank_tier |
| `rank_label` | TEXT NULL | human label e.g. "Divine 4" (computed + cached) |
| `mmr` | INTEGER NOT NULL DEFAULT 0 | **authoritative, user-editable** |
| `discord_username` | TEXT NULL | e.g. `player#0001` or new-style handle |
| `discord_url` | TEXT NULL | clickable link (opens in browser) |
| `notes` | TEXT NULL | freeform |
| `last_fetched_at` | TEXT NULL | ISO timestamp of last OpenDota sync |
| `created_at` | TEXT NOT NULL | ISO timestamp |
| `updated_at` | TEXT NOT NULL | ISO timestamp |

### Board state
The 5v5 board (which player sits in which of the 10 slots) is **frontend state**
(Zustand), persisted to a lightweight `board_state` table or a single JSON row so the
arrangement survives app restarts. Schema:

`board_state` table (single row, id=1): `team_a` TEXT (JSON array of up to 5 player ids), `team_b` TEXT (JSON array), `updated_at` TEXT.

> Match history is **not** in v1 scope. If added later, snapshot board_state into a
> `matches` table.

---

## 5. Rust ↔ Frontend API (Tauri Commands)

Define these `#[tauri::command]` functions. Frontend calls via `invoke()`.

```rust
// --- Player CRUD ---
list_players() -> Vec<Player>
get_player(id: i64) -> Option<Player>
create_player(input: PlayerInput) -> Player
update_player(id: i64, input: PlayerInput) -> Player
delete_player(id: i64) -> ()

// --- OpenDota ---
search_dota_players(query: String) -> Vec<DotaSearchResult>   // GET /search
fetch_dota_profile(account_id: i64) -> DotaProfile            // GET /players/{id}
refresh_player_from_dota(id: i64) -> Player                   // re-sync + recompute rank_label + estimate

// --- Helpers ---
resolve_steam_input(raw: String) -> ResolvedSteamId           // normalize id64/account_id/url
estimate_mmr_from_rank(rank_tier: i32, leaderboard_rank: Option<i32>) -> i32

// --- Board ---
get_board() -> BoardState
save_board(team_a: Vec<i64>, team_b: Vec<i64>) -> ()
```

Shared types (`Player`, `PlayerInput`, `DotaSearchResult`, `DotaProfile`,
`BoardState`) should be defined in Rust with `serde` and mirrored in TypeScript
(`src/types.ts`). Keep them in sync.

---

## 6. UI / UX Design

### 6.1 Layout (single window, 3 zones)
```
┌────────────────────────────────────────────────────────────────┐
│  TOP BAR:  [Dota 5v5 Organizer]      [+ Add Player] [Search 🔍]  │
├──────────────────────┬─────────────────────────────────────────┤
│  ROSTER (left, ~30%) │   THE BOARD (right, ~70%)                │
│                      │                                          │
│  ┌────────────────┐  │   TEAM A (Radiant)     TEAM B (Dire)     │
│  │ avatar  Name    │  │   ┌──────────┐         ┌──────────┐     │
│  │ Divine 4 · 5500 │  │   │ slot 1   │         │ slot 1   │     │
│  │ [discord]       │  │   │ slot 2   │         │ slot 2   │     │
│  └────────────────┘  │   │ slot 3   │         │ slot 3   │     │
│  (draggable cards,   │   │ slot 4   │         │ slot 4   │     │
│   searchable list)   │   │ slot 5   │         │ slot 5   │     │
│                      │   └──────────┘         └──────────┘     │
│                      │   Σ MMR: 27,300         Σ MMR: 26,900    │
│                      │        Δ Difference: 400  ✅ balanced     │
└──────────────────────┴─────────────────────────────────────────┘
```

### 6.2 Player Card (the reusable atom)
- Avatar (circular, with rank-medal-colored ring)
- Steam name (bold)
- Rank label + MMR (editable inline — click MMR to edit)
- Discord chip (clickable → opens Discord/profile URL in browser via Tauri shell)
- Drag handle (whole card is draggable into a slot)
- Hover: edit ✏️ / delete 🗑 / refresh-from-dota ⟳ actions

### 6.3 Add / Edit Player flow (modal)
1. **Search step:** input "Steam name or SteamID/URL".
   - If it looks like an id/url → resolve directly via `resolve_steam_input` + `fetch_dota_profile`.
   - If it's a name → call `search_dota_players`, show candidate list (avatar + name) → user picks.
2. **Confirm step:** form pre-filled with avatar, steam_name, rank_label, **estimated MMR**.
   - User edits MMR (required), adds Discord username + URL, notes.
3. Save → inserts into roster.
   - Allow a **"Manual entry (skip Dota)"** path for private profiles / no Steam.

### 6.4 The Board (drag & drop)
- 10 droppable slots (2 columns × 5). Built with `@dnd-kit`.
- Drag a roster card into a slot; dragging out returns it to roster.
- A player can only occupy one slot at a time (dedupe).
- Live footer per team: **Σ MMR** (sum of slotted players' `mmr`).
- Center readout: **Δ = |ΣA − ΣB|**, with a color/badge:
  - Δ ≤ 500 → green "balanced"
  - Δ ≤ 1500 → yellow "okay"
  - Δ > 1500 → red "unbalanced"
- Empty slots count as 0 and show a "+" placeholder.
- "Clear board" button.

### 6.5 Fancy polish (use Framer Motion)
- Cards animate on drop (scale/spring).
- MMR sum counts up/down smoothly when a slot changes.
- Rank ring colors per medal (Herald grey → Immortal red/gold).
- Dark theme by default (Dota-ish: dark slate + red/green team accents).

---

## 7. Build & Packaging (`.exe`)

- `npm run tauri build` produces the installer/exe under `src-tauri/target/release/bundle/`.
- **Must build on Windows** (local Windows machine or GitHub Actions `windows-latest`).
- Provide a GitHub Actions workflow `.github/workflows/build.yml` that builds the
  Windows `.exe` + NSIS installer on tag push, and uploads as a release artifact.
- App icon: design a Dota-themed icon, generate all sizes with `npm run tauri icon`.
- Set app metadata (name, version, publisher) in `src-tauri/tauri.conf.json`.

---

## 8. Execution Phases & Checklists

### Phase 0 — Scaffold ✅
- [x] `npm create tauri-app@latest` → React + TypeScript + Vite template
- [x] Add Tailwind CSS + configure
- [x] Add shadcn/ui, Framer Motion, @dnd-kit/core, zustand
- [x] Add Rust deps: `rusqlite` (bundled feature), `reqwest` (json, rustls), `serde`, `serde_json`, `chrono`
- [x] App runs with `npm run tauri dev` showing a blank themed window
- **Done when:** dev window opens, hot reload works, Rust command `greet` returns to frontend.

### Phase 1 — Storage layer ✅
- [x] Initialize SQLite DB in app data dir on startup; run migrations to create `players` + `board_state`
- [x] Implement `list_players`, `create_player`, `update_player`, `delete_player`, `get_player`
- [x] Implement `get_board` / `save_board`
- [x] TS types in `src/types.ts` mirror Rust structs
- **Done when:** can create/list/delete a dummy player from a temporary test button; data persists across restart.

### Phase 2 — OpenDota integration ✅
- [x] `resolve_steam_input` (id64 ↔ account_id ↔ url normalization)
- [x] `search_dota_players` (GET /search)
- [x] `fetch_dota_profile` (GET /players/{id}), handle null profile
- [x] `estimate_mmr_from_rank` + `rank_label` computation (Section 2 table)
- [x] `refresh_player_from_dota`
- [x] 24h caching via `last_fetched_at`
- **Done when:** given a known account_id (test with a public pro, e.g. Dendi `account_id 70388657`), backend returns avatar + "Divine/Immortal" label + estimate.

### Phase 3 — Roster UI ✅
- [x] Roster list panel with searchable/filterable player cards
- [x] Add Player modal: search step → confirm step (Section 6.3)
- [x] Manual-entry fallback path
- [x] Inline MMR edit, Discord chip opens link via Tauri `shell.open`
- [x] Edit / delete / refresh actions on each card
- **Done when:** user can add a real player by Steam name, see avatar+rank, set MMR + Discord, and it appears in the roster persistently.

### Phase 4 — The 5v5 Board ✅
- [x] Two teams × five `@dnd-kit` droppable slots
- [x] Drag roster cards into slots and back out; one-slot-per-player enforced
- [x] Live Σ MMR per team + Δ difference badge with color thresholds
- [x] Persist board via `save_board`; restore on launch
- [x] Clear board button
- **Done when:** dragging players updates both team sums live and the balance badge reacts correctly; arrangement survives restart.

### Phase 5 — Polish ✅
- [x] Framer Motion drop/sum animations
- [x] Rank-colored avatar rings, dark Dota theme
- [x] Empty/loading/error states (private profile, network fail, rate limit)
- [x] App icon + window title + metadata
- **Done when:** app feels finished and "fancy"; no raw error states leak to user.

### Phase 6 — Packaging ✅
- [x] `tauri.conf.json` metadata + icon
- [x] GitHub Actions workflow builds Windows `.exe` + installer on tag
- [ ] Smoke-test the installed `.exe` on Windows _(pending — requires a Windows machine / CI run)_
- **Done when:** a downloadable `.exe` installs and runs the full flow on a clean Windows machine.

---

## 9. Suggested Project Structure
```
dota2_5x5_custom/
├─ PLAN.md                      ← this file
├─ src/                         ← React frontend
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ types.ts                  ← TS mirrors of Rust types
│  ├─ store/                    ← zustand stores (roster, board)
│  ├─ lib/api.ts                ← invoke() wrappers for Tauri commands
│  ├─ components/
│  │  ├─ PlayerCard.tsx
│  │  ├─ RosterPanel.tsx
│  │  ├─ AddPlayerModal.tsx
│  │  ├─ Board.tsx
│  │  ├─ TeamColumn.tsx
│  │  ├─ Slot.tsx
│  │  └─ BalanceBadge.tsx
│  └─ styles/
├─ src-tauri/                   ← Rust backend
│  ├─ src/
│  │  ├─ main.rs
│  │  ├─ db.rs                  ← sqlite + migrations
│  │  ├─ opendota.rs            ← reqwest calls + rank logic
│  │  ├─ commands.rs            ← #[tauri::command] fns
│  │  └─ models.rs              ← serde structs
│  ├─ tauri.conf.json
│  └─ Cargo.toml
└─ .github/workflows/build.yml
```

---

## 10. Open Questions / Decisions Log
- ✅ Stack: Tauri + React + TS
- ✅ Data source: OpenDota (keyless)
- ✅ Storage: SQLite
- ✅ Features in scope: saved roster + drag-&-drop board with live MMR sums
- ⬜ (Future) Auto-balance button (algorithm to split roster into fairest 5v5)
- ⬜ (Future) Match history / results tracking
- ⬜ (Future) Export/share a lobby as image or text for Discord
- ✅ Theme accent colors: Radiant green / Dire red (implemented)

---

## 11. Definition of Done (whole app)
1. User can add players by Steam name or ID; avatar + rank auto-fill from OpenDota.
2. MMR is editable; Discord link is clickable.
3. Roster persists locally (SQLite) across restarts.
4. User drags 10 players into two teams; each team's total MMR and the difference
   update live with a balance indicator.
5. Board arrangement persists.
6. App ships as a working Windows `.exe`.
