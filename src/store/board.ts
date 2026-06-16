import { create } from "zustand";
import { api } from "../lib/api";
import { TEAM_SIZE, type TeamId } from "../types";

type Slots = (number | null)[];

function emptyTeam(): Slots {
  return Array(TEAM_SIZE).fill(null);
}

function normalize(arr: Slots | undefined): Slots {
  const out = emptyTeam();
  if (arr) {
    for (let i = 0; i < TEAM_SIZE; i++) out[i] = arr[i] ?? null;
  }
  return out;
}

interface BoardStore {
  teamA: Slots;
  teamB: Slots;
  loaded: boolean;
  load: () => Promise<void>;
  /** Place a player into a specific slot, removing them from any prior slot. */
  place: (playerId: number, team: TeamId, slot: number) => void;
  /** Remove a player from the board entirely (returns them to the roster). */
  remove: (playerId: number) => void;
  clearSlot: (team: TeamId, slot: number) => void;
  clear: () => void;
}

function persist(teamA: Slots, teamB: Slots) {
  api.saveBoard(teamA, teamB).catch(() => {});
}

export const useBoard = create<BoardStore>((set, get) => ({
  teamA: emptyTeam(),
  teamB: emptyTeam(),
  loaded: false,

  load: async () => {
    try {
      const b = await api.getBoard();
      set({ teamA: normalize(b.teamA), teamB: normalize(b.teamB), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  place: (playerId, team, slot) => {
    const teamA = [...get().teamA];
    const teamB = [...get().teamB];
    // A player can occupy only one slot: clear any previous placement.
    for (let i = 0; i < TEAM_SIZE; i++) {
      if (teamA[i] === playerId) teamA[i] = null;
      if (teamB[i] === playerId) teamB[i] = null;
    }
    const target = team === "A" ? teamA : teamB;
    target[slot] = playerId; // overwrites occupant -> occupant returns to roster
    set({ teamA, teamB });
    persist(teamA, teamB);
  },

  remove: (playerId) => {
    const teamA = get().teamA.map((x) => (x === playerId ? null : x));
    const teamB = get().teamB.map((x) => (x === playerId ? null : x));
    set({ teamA, teamB });
    persist(teamA, teamB);
  },

  clearSlot: (team, slot) => {
    const teamA = [...get().teamA];
    const teamB = [...get().teamB];
    (team === "A" ? teamA : teamB)[slot] = null;
    set({ teamA, teamB });
    persist(teamA, teamB);
  },

  clear: () => {
    const teamA = emptyTeam();
    const teamB = emptyTeam();
    set({ teamA, teamB });
    persist(teamA, teamB);
  },
}));
