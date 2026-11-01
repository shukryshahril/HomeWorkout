import { isRoute, maxLevel, minLevel } from "../program";
import {
  type AppState, type Profile, type Settings, type SetLog, type WorkoutLog,
  accentChoices, appearances, defaultSettings, parseOffsets,
} from "../records";
import { db, transaction } from "./db";

export class InputError extends Error {}

type Row = Record<string, unknown>;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function toProfile(r: Row): Profile {
  return {
    dumbbells: Number(r.dumbbells),
    kettlebells: Number(r.kettlebells),
    bench: r.bench === 1,
    pullUpBar: r.pull_up_bar === 1,
    band: r.band === 1,
    createdAt: String(r.created_at),
    block: Number(r.block),
    level: Number(r.level),
    assessed: r.assessed === 1,
    route: isRoute(r.route) ? r.route : "balanced",
    dumbbellWeights: String(r.dumbbell_weights),
    movementOffsets: parseOffsets(JSON.parse(String(r.movement_offsets))),
  };
}

function toLog(r: Row): WorkoutLog {
  return {
    day: Number(r.day),
    block: Number(r.block),
    completedAt: String(r.completed_at),
    durationSeconds: Number(r.duration_seconds),
    setsDone: Number(r.sets_done),
    setsSkipped: Number(r.sets_skipped),
    bodyweightOnly: r.bodyweight_only === 1,
    rating: num(r.rating),
  };
}

function toSet(r: Row): SetLog {
  return {
    date: String(r.date),
    block: Number(r.block),
    day: Number(r.day),
    exerciseID: String(r.exercise_id),
    setNumber: Number(r.set_number),
    reps: num(r.reps),
    seconds: num(r.seconds),
    weightKg: num(r.weight_kg),
    targetReps: num(r.target_reps),
    targetSeconds: num(r.target_seconds),
  };
}

function readSettings(): Settings {
  const stored = new Map(
    (db().prepare("SELECT key, value FROM settings").all() as Row[]).map((r) => [String(r.key), String(r.value)]),
  );
  const appearance = stored.get("appearance");
  const accent = stored.get("accent");
  return {
    userName: stored.get("userName") ?? defaultSettings.userName,
    appearance: appearances.find((a) => a === appearance) ?? defaultSettings.appearance,
    accent: accentChoices.find((a) => a === accent) ?? defaultSettings.accent,
    showFormVideo: stored.has("showFormVideo") ? stored.get("showFormVideo") === "1" : defaultSettings.showFormVideo,
  };
}

export function getState(): AppState {
  const database = db();
  const profile = database.prepare("SELECT * FROM profile WHERE id = 1").get() as Row | undefined;
  return {
    profile: profile ? toProfile(profile) : null,
    logs: (database.prepare("SELECT * FROM workout_logs ORDER BY block, day").all() as Row[]).map(toLog),
    sets: (database.prepare("SELECT * FROM set_logs ORDER BY date, id").all() as Row[]).map(toSet),
    settings: readSettings(),
  };
}

// MARK: Validation

function int(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new InputError(`Expected a whole number from ${min} to ${max}.`);
  }
  return value;
}

function optionalInt(value: unknown, min: number, max: number): number | null {
  return value === null || value === undefined ? null : int(value, min, max);
}

function optionalKg(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 500) throw new InputError("Invalid weight.");
  return value;
}

function bool(value: unknown): boolean {
  if (typeof value !== "boolean") throw new InputError("Expected true or false.");
  return value;
}

function isoDate(value: unknown): string {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw new InputError("Invalid date.");
  return date.toISOString();
}

const record = (value: unknown): Row => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Expected an object.");
  return value as Row;
};

const flag = (b: boolean) => (b ? 1 : 0);

// MARK: Profile

const profileColumns: Record<string, (v: unknown) => [string, unknown]> = {
  dumbbells: (v) => ["dumbbells", int(v, 0, 2)],
  kettlebells: (v) => ["kettlebells", int(v, 0, 2)],
  bench: (v) => ["bench", flag(bool(v))],
  pullUpBar: (v) => ["pull_up_bar", flag(bool(v))],
  band: (v) => ["band", flag(bool(v))],
  block: (v) => ["block", int(v, 1, 10_000)],
  level: (v) => ["level", int(v, minLevel, maxLevel)],
  assessed: (v) => ["assessed", flag(bool(v))],
  route: (v) => {
    if (!isRoute(v)) throw new InputError("Unknown route.");
    return ["route", v];
  },
  dumbbellWeights: (v) => {
    if (typeof v !== "string" || v.length > 200) throw new InputError("Invalid dumbbell weights.");
    return ["dumbbell_weights", v];
  },
  movementOffsets: (v) => ["movement_offsets", JSON.stringify(parseOffsets(record(v)))],
};

// Creates the profile on first save, then applies only the fields given.
export function saveProfile(patch: unknown): AppState {
  const changes = Object.entries(record(patch))
    .filter(([key]) => key in profileColumns)
    .map(([key, value]) => profileColumns[key](value));
  transaction((database) => {
    database.prepare("INSERT OR IGNORE INTO profile (id, created_at) VALUES (1, ?)").run(new Date().toISOString());
    for (const [column, value] of changes) {
      database.prepare(`UPDATE profile SET ${column} = ? WHERE id = 1`).run(value as string | number);
    }
  });
  return getState();
}

// MARK: Sessions

// Upserts the day's log; a rerun with logged sets replaces that day's earlier set logs.
export function recordSession(body: unknown): AppState {
  const input = record(body);
  const block = int(input.block, 1, 10_000);
  const day = int(input.day, 1, 30);
  const log = {
    duration: int(input.durationSeconds, 0, 86_400),
    done: int(input.setsDone, 0, 1_000),
    skipped: int(input.setsSkipped, 0, 1_000),
    bodyweightOnly: flag(bool(input.bodyweightOnly)),
    rating: optionalInt(input.rating, 1, 5),
  };
  const sets = (Array.isArray(input.sets) ? input.sets : []).map((raw) => {
    const s = record(raw);
    if (typeof s.exerciseID !== "string" || s.exerciseID.length > 100) throw new InputError("Invalid exercise.");
    return [
      s.exerciseID, int(s.setNumber, 1, 100), optionalInt(s.reps, 0, 1_000), optionalInt(s.seconds, 0, 3_600),
      optionalKg(s.weightKg), optionalInt(s.targetReps, 0, 1_000), optionalInt(s.targetSeconds, 0, 3_600),
    ] as const;
  });
  const now = new Date().toISOString();
  transaction((database) => {
    const existing = database.prepare("SELECT id FROM workout_logs WHERE block = ? AND day = ?").get(block, day) as Row | undefined;
    if (existing) {
      database.prepare(`UPDATE workout_logs SET completed_at = ?, duration_seconds = ?, sets_done = ?, sets_skipped = ?,
        bodyweight_only = ?, rating = ? WHERE id = ?`)
        .run(now, log.duration, log.done, log.skipped, log.bodyweightOnly, log.rating, Number(existing.id));
    } else {
      database.prepare(`INSERT INTO workout_logs (block, day, completed_at, duration_seconds, sets_done, sets_skipped,
        bodyweight_only, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(block, day, now, log.duration, log.done, log.skipped, log.bodyweightOnly, log.rating);
    }
    if (sets.length > 0) {
      database.prepare("DELETE FROM set_logs WHERE block = ? AND day = ?").run(block, day);
      const insert = database.prepare(`INSERT INTO set_logs (date, block, day, exercise_id, set_number, reps, seconds,
        weight_kg, target_reps, target_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const s of sets) insert.run(now, block, day, ...s);
    }
  });
  return getState();
}

export function clearDay(body: unknown): AppState {
  const input = record(body);
  const block = int(input.block, 1, 10_000);
  const day = int(input.day, 1, 30);
  transaction((database) => {
    database.prepare("DELETE FROM workout_logs WHERE block = ? AND day = ?").run(block, day);
    database.prepare("DELETE FROM set_logs WHERE block = ? AND day = ?").run(block, day);
  });
  return getState();
}

// MARK: Settings

function settingValue(key: string, value: unknown): string {
  switch (key) {
    case "userName":
      if (typeof value !== "string" || value.length > 60) throw new InputError("Invalid name.");
      return value;
    case "appearance":
      if (!appearances.some((a) => a === value)) throw new InputError("Unknown appearance.");
      return String(value);
    case "accent":
      if (!accentChoices.some((a) => a === value)) throw new InputError("Unknown accent.");
      return String(value);
    case "showFormVideo":
      return bool(value) ? "1" : "0";
    default:
      throw new InputError(`Unknown setting ${key}.`);
  }
}

export function saveSettings(patch: unknown): AppState {
  const entries = Object.entries(record(patch)).map(([key, value]) => [key, settingValue(key, value)] as const);
  transaction((database) => {
    const upsert = database.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value");
    for (const [key, value] of entries) upsert.run(key, value);
  });
  return getState();
}

// MARK: Backup

// Version 2 JSON backup format.
export const backupVersion = 2;
const settingsKeys = ["userName", "appearance", "accent", "showFormVideo"];

// Use ISO 8601 without fractional seconds for backup compatibility.
const appleDate = (iso: string) => new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");

export function makeBackup() {
  const state = getState();
  const stored = db().prepare("SELECT key, value FROM settings").all() as Row[];
  const p = state.profile;
  return {
    version: backupVersion,
    exportedAt: appleDate(new Date().toISOString()),
    profile: p && {
      gear: { dumbbells: p.dumbbells, kettlebells: p.kettlebells, bench: p.bench, pullUpBar: p.pullUpBar, band: p.band },
      block: p.block,
      level: p.level,
      createdAt: appleDate(p.createdAt),
      assessed: p.assessed,
      route: p.route,
      dumbbellWeights: p.dumbbellWeights,
      movementOffsets: p.movementOffsets,
    },
    logs: state.logs.map((l) => ({ ...l, completedAt: appleDate(l.completedAt), rating: l.rating ?? undefined })),
    sets: state.sets.map((s) => {
      const set: Record<string, unknown> = { ...s, date: appleDate(s.date) };
      for (const key of Object.keys(set)) if (set[key] === null) delete set[key];
      return set;
    }),
    settings: Object.fromEntries(stored.filter((r) => settingsKeys.includes(String(r.key))).map((r) => [r.key, r.value])),
  };
}

export class BackupError extends Error {}

// Replaces all current data with the backup's contents.
export function restoreBackup(raw: unknown): AppState {
  let backup: Row;
  let profile: Row | null;
  let logs: Row[];
  let sets: Row[];
  let settings: Row;
  try {
    backup = record(raw);
    if (typeof backup.version !== "number" || !Array.isArray(backup.logs)) throw new InputError("Not a backup.");
    profile = backup.profile ? record(backup.profile) : null;
    logs = backup.logs.map(record);
    sets = Array.isArray(backup.sets) ? backup.sets.map(record) : [];
    settings = record(backup.settings);
  } catch {
    throw new BackupError("That file isn't a Home Workout backup.");
  }
  if (backup.version > backupVersion) {
    throw new BackupError("This backup was made by a newer version of the app. Update the app, then import again.");
  }
  try {
    transaction((database) => {
      database.exec("DELETE FROM workout_logs; DELETE FROM set_logs; DELETE FROM profile;");
      if (profile) {
        const gear = record(profile.gear);
        database.prepare(`INSERT INTO profile (id, dumbbells, kettlebells, bench, pull_up_bar, band, created_at, block, level,
          assessed, route, dumbbell_weights, movement_offsets) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          int(gear.dumbbells, 0, 2), int(gear.kettlebells, 0, 2), flag(bool(gear.bench)), flag(bool(gear.pullUpBar)),
          flag(bool(gear.band)), isoDate(profile.createdAt), int(profile.block, 1, 10_000), int(profile.level, minLevel, maxLevel),
          // Backups made before the assessment existed count as assessed so restoring lands on the program.
          flag(profile.assessed === undefined ? true : bool(profile.assessed)),
          isRoute(profile.route) ? profile.route : "balanced",
          typeof profile.dumbbellWeights === "string" ? profile.dumbbellWeights : "",
          JSON.stringify(parseOffsets(profile.movementOffsets)),
        );
      }
      const insertLog = database.prepare(`INSERT INTO workout_logs (block, day, completed_at, duration_seconds, sets_done,
        sets_skipped, bodyweight_only, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const l of logs) {
        insertLog.run(int(l.block, 1, 10_000), int(l.day, 1, 30), isoDate(l.completedAt), int(l.durationSeconds, 0, 86_400),
          int(l.setsDone, 0, 1_000), int(l.setsSkipped, 0, 1_000), flag(bool(l.bodyweightOnly)), optionalInt(l.rating, 1, 5));
      }
      const insertSet = database.prepare(`INSERT INTO set_logs (date, block, day, exercise_id, set_number, reps, seconds,
        weight_kg, target_reps, target_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const s of sets) {
        insertSet.run(isoDate(s.date), int(s.block, 1, 10_000), int(s.day, 1, 30), String(s.exerciseID), int(s.setNumber, 1, 100),
          optionalInt(s.reps, 0, 1_000), optionalInt(s.seconds, 0, 3_600), optionalKg(s.weightKg),
          optionalInt(s.targetReps, 0, 1_000), optionalInt(s.targetSeconds, 0, 3_600));
      }
      const upsert = database.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value");
      for (const [key, value] of Object.entries(settings)) {
        if (!settingsKeys.includes(key) || typeof value !== "string") continue;
        // Accept video toggles stored as "1"/"0" or "true"/"false".
        upsert.run(key, key === "showFormVideo" ? (value === "1" || value === "true" ? "1" : "0") : value);
      }
    });
  } catch (error) {
    if (error instanceof InputError) throw new BackupError("That file isn't a Home Workout backup.");
    throw error;
  }
  return getState();
}
