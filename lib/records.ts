import { type Exercise, type Movement, exerciseById, isLoaded, isMovement, isTimed, ladderMovements } from "./exercise";
import type { Gear } from "./gear";
import { type MovementOffsets, type ProgramContext, type Route, type SessionAdjustment, maxLevel, minLevel, programLength } from "./program";

// Shapes stored by the server and sent to the client in AppState.

export type Profile = Gear & {
  createdAt: string;
  // Which 30-day block is running, and its starting difficulty (see planDay).
  block: number;
  level: number;
  assessed: boolean;
  route: Route;
  // Dumbbell weights the user owns, in kg, comma separated; drives load suggestions.
  dumbbellWeights: string;
  // Per-movement ladder shift earned from logged sets.
  movementOffsets: MovementOffsets;
};

export type WorkoutLog = {
  day: number;
  block: number;
  completedAt: string;
  durationSeconds: number;
  setsDone: number;
  setsSkipped: number;
  bodyweightOnly: boolean;
  // Self-rated difficulty, 1 (easy) to 5 (max effort).
  rating: number | null;
};

// One logged set. Targets are stored alongside so progress survives later program changes.
export type SetLog = {
  date: string;
  block: number;
  day: number;
  exerciseID: string;
  setNumber: number;
  reps: number | null;
  seconds: number | null;
  weightKg: number | null;
  targetReps: number | null;
  targetSeconds: number | null;
};

export const appearances = ["light", "dark"] as const;
export type Appearance = (typeof appearances)[number];

export const accentChoices = ["ember", "magenta", "violet", "cobalt", "pine"] as const;
export type AccentChoice = (typeof accentChoices)[number];

// Every option keeps white text readable on top of it.
export const accentColor: Record<AccentChoice, string> = {
  ember: "#E8432B",
  magenta: "#D3246B",
  violet: "#6E44E0",
  cobalt: "#2F5BEA",
  pine: "#1F6F78",
};

export type Settings = {
  userName: string;
  appearance: Appearance;
  accent: AccentChoice;
  showFormVideo: boolean;
};

export const defaultSettings: Settings = { userName: "", appearance: "light", accent: "ember", showFormVideo: false };

export type AppState = {
  profile: Profile | null;
  logs: WorkoutLog[];
  sets: SetLog[];
  settings: Settings;
};

export function profileGear(p: Profile): Gear {
  return { dumbbells: p.dumbbells, kettlebells: p.kettlebells, bench: p.bench, pullUpBar: p.pullUpBar, band: p.band };
}

export function profileContext(p: Profile): ProgramContext {
  return { gear: profileGear(p), level: p.level, block: p.block, route: p.route, offsets: p.movementOffsets };
}

export function ownedWeights(p: Profile): number[] {
  return p.dumbbellWeights
    .split(/[, ]+/)
    .map((s) => s.replaceAll("kg", ""))
    .filter((s) => s.trim() !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

export function parseOffsets(raw: unknown): MovementOffsets {
  const offsets: MovementOffsets = {};
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      if (isMovement(key) && Number.isInteger(value)) offsets[key] = value as number;
    }
  }
  return offsets;
}

export const kgText = (kg: number) => (Number.isInteger(kg) ? String(kg) : kg.toFixed(1));

export function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// MARK: Sets

export function hitTarget(set: SetLog): boolean {
  if (set.targetSeconds !== null) return (set.seconds ?? 0) >= set.targetSeconds;
  if (set.targetReps !== null) return (set.reps ?? 0) >= set.targetReps;
  return true;
}

export function missedBig(set: SetLog): boolean {
  if (set.targetReps !== null && set.reps !== null) return set.reps < set.targetReps - 2;
  if (set.targetSeconds !== null && set.seconds !== null) return set.seconds < set.targetSeconds - 10;
  return false;
}

// Single number to chart: kg for loaded sets, otherwise reps or seconds.
export const setScore = (set: SetLog) => set.weightKg ?? set.reps ?? set.seconds ?? 0;

// Sets from the most recent session that included this exercise.
export function lastSession(sets: SetLog[], exerciseID: string): SetLog[] {
  const mine = sets.filter((s) => s.exerciseID === exerciseID);
  if (mine.length === 0) return [];
  const latest = mine.reduce((a, b) => (b.date > a.date ? b : a));
  return mine.filter((s) => s.block === latest.block && s.day === latest.day).sort((a, b) => a.setNumber - b.setNumber);
}

export type LoadAdvice = {
  kind: "first" | "progress" | "repeatTarget" | "hold";
  message: string;
  suggestedKg: number | null;
};

// Double progression: earn the top of the rep range on every set, then add load (or tempo if no heavier dumbbell).
export function loadAdvice(sets: SetLog[], exercise: Exercise, weights: number[]): LoadAdvice | null {
  const last = lastSession(sets, exercise.id);
  if (last.length === 0) {
    return isLoaded(exercise)
      ? { kind: "first", message: "First time: pick a weight you could lift 2–3 more reps with.", suggestedKg: null }
      : null;
  }
  const kgs = last.map((s) => s.weightKg).filter((kg): kg is number => kg !== null);
  const lastKg = kgs.length > 0 ? Math.max(...kgs) : null;
  const kg = lastKg !== null ? `${kgText(lastKg)} kg` : null;
  if (last.every(hitTarget)) {
    if (isLoaded(exercise) && lastKg !== null) {
      const next = weights.find((w) => w > lastKg);
      if (next !== undefined) return { kind: "progress", message: `Hit every rep at ${kg} · go ${kgText(next)} kg`, suggestedKg: next };
      return { kind: "progress", message: "Hit every rep at your heaviest · slow the lowering to 4s", suggestedKg: lastKg };
    }
    return {
      kind: "progress",
      message: isTimed(exercise) ? "Held it all last time · aim 5–10s longer" : "Hit every rep last time · add a rep or slow down",
      suggestedKg: null,
    };
  }
  if (last.some(missedBig)) {
    return { kind: "hold", message: kg ? `Missed reps at ${kg} · stay there` : "Missed reps last time · same target, clean form", suggestedKg: lastKg };
  }
  return { kind: "repeatTarget", message: kg ? `Close at ${kg} · same weight, hit every rep` : "Close last time · hit every rep today", suggestedKg: lastKg };
}

// Ladder moves earned in a block, judged on the heavy weeks (day 15 on) so early-block form practice does not count.
export function ladderGrowth(sets: SetLog[], block: number): MovementOffsets {
  const heavy = sets.filter((s) => s.block === block && s.day >= 15);
  const result: MovementOffsets = {};
  for (const movement of ladderMovements) {
    const mine = heavy.filter((s) => exerciseById(s.exerciseID)?.movement === movement);
    if (mine.length < 4) continue;
    const hitRate = mine.filter(hitTarget).length / mine.length;
    if (hitRate >= 0.9) result[movement] = 1;
    else if (hitRate < 0.6) result[movement] = -1;
  }
  return result;
}

// MARK: Workout logs

export const inBlock = (logs: WorkoutLog[], block: number) => logs.filter((l) => l.block === block);
export const completedDays = (logs: WorkoutLog[]) => new Set(logs.map((l) => l.day));

export function nextDay(logs: WorkoutLog[]): number {
  const done = completedDays(logs);
  for (let day = 1; day <= programLength; day++) if (!done.has(day)) return day;
  return programLength;
}

const skipRatio = (log: WorkoutLog) => {
  const total = log.setsDone + log.setsSkipped;
  return total === 0 ? 0 : log.setsSkipped / total;
};

// Adjusts only the upcoming session, from the previous training session's rating and skipped sets.
// Expects logs already scoped to one block.
export function sessionAdjustment(logs: WorkoutLog[], day: number): SessionAdjustment {
  if (day !== nextDay(logs)) return "none";
  const trained = logs.filter((l) => l.day < day && l.setsDone + l.setsSkipped > 0);
  if (trained.length === 0) return "none";
  const last = trained.reduce((a, b) => (b.day > a.day ? b : a));
  if (skipRatio(last) >= 1 / 3 || last.rating === 5) return "deload";
  if (last.rating === 1) return "push";
  if (last.rating === 4) return "ease";
  return "none";
}

// Next block's level from this block's ratings. Ladders carry long-term growth, so level only nudges:
// restart levels climb back toward standard, easy blocks step up, very hard blocks step down.
export function nextBlockLevel(logs: WorkoutLog[], level: number): number {
  const ratings = logs.map((l) => l.rating).filter((r): r is number => r !== null);
  const average = ratings.length === 0 ? 3 : ratings.reduce((a, b) => a + b, 0) / ratings.length;
  let next = level;
  if (average <= 2) next += 1;
  else if (level < 0 && average < 4) next += 1;
  else if (average >= 4.5) next -= 1;
  return Math.min(maxLevel, Math.max(minLevel, next));
}

export const difficulties = [
  { value: 1, label: "Easy", note: "Next session moves one rep step harder." },
  { value: 2, label: "Steady", note: "Good working effort. Plan stays as is." },
  { value: 3, label: "Hard", note: "Right where the program wants you." },
  { value: 4, label: "Very hard", note: "Next session holds reps and adds 15s rest." },
  { value: 5, label: "Max", note: "Next session auto-deloads so you can recover." },
] as const;

export function applyGrowth(offsets: MovementOffsets, growth: MovementOffsets): MovementOffsets {
  const next = { ...offsets };
  for (const [movement, delta] of Object.entries(growth) as [Movement, number][]) {
    next[movement] = Math.min(2, Math.max(-2, (next[movement] ?? 0) + delta));
  }
  return next;
}
