"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AppState, Profile, Settings } from "@/lib/records";

export type SessionRecord = {
  block: number;
  day: number;
  durationSeconds: number;
  setsDone: number;
  setsSkipped: number;
  bodyweightOnly: boolean;
  rating: number | null;
  sets?: {
    exerciseID: string;
    setNumber: number;
    reps: number | null;
    seconds: number | null;
    weightKg: number | null;
    targetReps: number | null;
    targetSeconds: number | null;
  }[];
};

type Store = {
  state: AppState | null;
  error: string | null;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  recordSession: (record: SessionRecord) => Promise<void>;
  clearDay: (block: number, day: number) => Promise<void>;
  restoreBackup: (backup: unknown) => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

async function send(method: string, url: string, body?: unknown): Promise<AppState> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Request failed.");
  return json as AppState;
}

// Loads everything once and keeps it in memory; every write returns the fresh state from the server.
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    send("GET", "/api/state").then(setState, (e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!state) return;
    const { appearance, accent } = state.settings;
    document.documentElement.dataset.theme = appearance;
    document.documentElement.dataset.accent = accent;
    localStorage.setItem("hw-theme", JSON.stringify({ appearance, accent }));
  }, [state]);

  const write = useCallback(async (request: Promise<AppState>) => {
    try {
      setState(await request);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      send("GET", "/api/state").then(setState, () => {});
      throw e;
    }
  }, []);

  const store: Store = {
    state,
    error,
    // Profile and settings changes show immediately; the server copy replaces them when it answers.
    saveProfile: (patch) => {
      setState((s) => (s?.profile ? { ...s, profile: { ...s.profile, ...patch } } : s));
      return write(send("PATCH", "/api/profile", patch));
    },
    saveSettings: (patch) => {
      setState((s) => (s ? { ...s, settings: { ...s.settings, ...patch } } : s));
      return write(send("PATCH", "/api/settings", patch));
    },
    recordSession: (record) => write(send("POST", "/api/sessions", record)),
    clearDay: (block, day) => write(send("DELETE", "/api/sessions", { block, day })),
    restoreBackup: (backup) => write(send("POST", "/api/backup", backup)),
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore outside StoreProvider");
  return store;
}
