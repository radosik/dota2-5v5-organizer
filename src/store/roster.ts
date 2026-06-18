import { create } from "zustand";
import { api } from "../lib/api";
import { playerToInput } from "../lib/util";
import type { Player, PlayerInput } from "../types";
import { useBoard } from "./board";

interface RosterStore {
  players: Player[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (input: PlayerInput) => Promise<Player>;
  update: (id: number, input: PlayerInput) => Promise<Player>;
  remove: (id: number) => Promise<void>;
  refresh: (id: number) => Promise<Player>;
  setMmr: (id: number, mmr: number) => Promise<void>;
  setActive: (id: number, active: boolean) => Promise<void>;
}

export const useRoster = create<RosterStore>((set, get) => ({
  players: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const players = await api.listPlayers();
      set({ players, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  add: async (input) => {
    const p = await api.createPlayer(input);
    await get().load();
    return p;
  },

  update: async (id, input) => {
    const p = await api.updatePlayer(id, input);
    await get().load();
    return p;
  },

  remove: async (id) => {
    await api.deletePlayer(id);
    useBoard.getState().remove(id); // cascade: drop from board too
    await get().load();
  },

  refresh: async (id) => {
    const p = await api.refreshPlayerFromDota(id);
    await get().load();
    return p;
  },

  setMmr: async (id, mmr) => {
    const player = get().players.find((p) => p.id === id);
    if (!player) return;
    await api.updatePlayer(id, { ...playerToInput(player), mmr });
    await get().load();
  },

  setActive: async (id, active) => {
    // Optimistic: flip locally so the Active list updates instantly.
    set({ players: get().players.map((p) => (p.id === id ? { ...p, isActive: active } : p)) });
    try {
      await api.setPlayerActive(id, active);
    } catch {
      await get().load(); // revert on failure
    }
    // If a player goes offline, pull them off the board too.
    if (!active) useBoard.getState().remove(id);
  },
}));
