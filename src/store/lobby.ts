import { create } from "zustand";
import { api } from "../lib/api";
import type { Lobby } from "../types";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

interface LobbyStore extends Lobby {
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Lobby>) => void;
}

export const useLobby = create<LobbyStore>((set, get) => ({
  region: "",
  roomName: "",
  roomPassword: "",
  discordWebhook: "",
  loaded: false,

  load: async () => {
    try {
      const l = await api.getLobby();
      set({ ...l, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  update: (patch) => {
    set(patch);
    const { region, roomName, roomPassword, discordWebhook } = get();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      api.saveLobby(region, roomName, roomPassword, discordWebhook).catch(() => {});
    }, 400);
  },
}));
