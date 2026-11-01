import { type Exercise, isLoaded } from "./exercise";
import {
  type DayPlan, type PlannedExercise, circuitRoundRest, circuitTransition, planRounds, warmupSeconds, workSeconds,
} from "./program";

export type Step =
  | { type: "warmup"; index: number }
  | { type: "prepare"; item: number }
  | { type: "work"; item: number; set: number }
  | { type: "rest"; item: number; afterSet: number; seconds: number };

const stepItem = (step: Step): number | null => (step.type === "warmup" ? null : step.item);

// What the user actually did on one set; reps and kg start at the target and last-used weight.
export type SetEntry = {
  item: number;
  set: number;
  reps: number | null;
  seconds: number | null;
  weightKg: number | null;
};

type Outcome = "done" | "skipped";

export type Cue = "work" | "light" | "finish";

export class WorkoutSession {
  readonly plan: DayPlan;
  readonly steps: Step[];
  private readonly timeScale: number;
  private readonly onCue: (cue: Cue) => void;

  index = 0;
  remaining = 0;
  stepLength = 1;
  isPaused = false;
  isFinished = false;
  elapsed = 0;
  entries = new Map<number, SetEntry>();
  // Current working weight per exercise, seeded from suggestions and updated as the user logs.
  private weights = new Map<number, number | null>();

  // Outcome per work-step index, so stepping back can undo a set's result.
  private outcomes = new Map<number, Outcome>();
  private skippedItems = new Set<number>();

  private ticker: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();
  private listeners = new Set<() => void>();
  // Bumped on every change so React can subscribe with useSyncExternalStore.
  version = 0;

  constructor(plan: DayPlan, options: { startingWeights?: Record<string, number>; timeScale?: number; onCue?: (cue: Cue) => void } = {}) {
    this.plan = plan;
    this.timeScale = options.timeScale ?? 1;
    this.onCue = options.onCue ?? (() => {});
    const steps: Step[] = plan.warmup.map((_, index) => ({ type: "warmup", index }));
    if (plan.items.length > 0) steps.push({ type: "prepare", item: 0 });
    if (plan.isCircuit) {
      const rounds = planRounds(plan);
      for (let round = 1; round <= Math.max(1, rounds); round++) {
        const inRound = plan.items.flatMap((item, i) => (item.prescription.sets >= round ? [i] : []));
        inRound.forEach((i, position) => {
          steps.push({ type: "work", item: i, set: round });
          const endOfRound = position === inRound.length - 1;
          if (endOfRound && round === rounds) return;
          steps.push({ type: "rest", item: i, afterSet: round, seconds: endOfRound ? circuitRoundRest : circuitTransition });
        });
      }
    } else {
      plan.items.forEach((item, i) => {
        for (let set = 1; set <= item.prescription.sets; set++) {
          steps.push({ type: "work", item: i, set });
          const isFinalSet = set === item.prescription.sets && i === plan.items.length - 1;
          if (!isFinalSet) steps.push({ type: "rest", item: i, afterSet: set, seconds: item.prescription.restSeconds });
        }
      });
    }
    this.steps = steps;
    plan.items.forEach((item, i) => {
      const kg = options.startingWeights?.[item.exercise.id];
      if (kg !== undefined) this.weights.set(i, kg);
    });
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.version++;
    for (const listener of this.listeners) listener();
  }

  get step(): Step | null {
    return this.steps[this.index] ?? null;
  }

  get currentItem(): PlannedExercise | null {
    const item = this.step ? stepItem(this.step) : null;
    return item === null ? null : this.plan.items[item];
  }

  get currentWarmup(): Exercise | null {
    const step = this.step;
    return step?.type === "warmup" ? (this.plan.warmup[step.index] ?? null) : null;
  }

  get progress() {
    return this.stepLength > 0 ? 1 - this.remaining / this.stepLength : 0;
  }

  get remainingSeconds() {
    return Math.max(0, Math.ceil(this.remaining / this.timeScale));
  }

  get setsDone() {
    return [...this.outcomes.values()].filter((o) => o === "done").length;
  }

  get setsSkipped() {
    return [...this.outcomes.values()].filter((o) => o === "skipped").length;
  }

  get canGoBack() {
    return this.index > 0 && !this.isFinished;
  }

  private get nextWorkIndex(): number | null {
    for (let i = this.index + 1; i < this.steps.length; i++) {
      const s = this.steps[i];
      if (s.type === "work" && !this.skippedItems.has(s.item)) return i;
    }
    return null;
  }

  get upNext(): PlannedExercise | null {
    const i = this.nextWorkIndex;
    if (i === null) return null;
    const item = stepItem(this.steps[i]);
    return item === null ? null : this.plan.items[item];
  }

  // Set number the upcoming work step will be, shown during rest.
  get upNextSet(): number | null {
    const i = this.nextWorkIndex;
    const s = i === null ? null : this.steps[i];
    return s?.type === "work" ? s.set : null;
  }

  // The set just finished, editable while resting.
  get editableEntryIndex(): number | null {
    if (this.step?.type !== "rest") return null;
    for (let i = this.index - 1; i >= 0; i--) {
      if (this.steps[i].type === "work") return this.entries.has(i) ? i : null;
    }
    return null;
  }

  weight(item: number): number | null {
    return this.weights.get(item) ?? null;
  }

  start() {
    if (this.ticker) return;
    this.enter(0);
    this.lastTick = Date.now();
    this.ticker = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.lastTick = Date.now();
    this.emit();
  }

  // Ends the current step early: a work step counts as done, rest/prepare/warm-up just moves on.
  completeStep() {
    this.record("done");
    this.advance();
  }

  // Skips forward: a work step counts as skipped.
  skip() {
    this.record("skipped");
    this.advance();
  }

  skipWarmup() {
    if (this.step?.type !== "warmup") return;
    const first = this.steps.findIndex((s) => s.type !== "warmup");
    if (first >= 0) this.enter(first);
  }

  // A set more than 3s in restarts; otherwise (and always from rest) returns to the previous set and clears its result.
  back() {
    if (this.isFinished) return;
    const realElapsed = (this.stepLength - this.remaining) / this.timeScale;
    if ((this.step?.type === "work" && realElapsed > 3) || this.index === 0) {
      this.enter(this.index);
      return;
    }
    let target = this.index - 1;
    while (target > 0 && this.steps[target].type !== "work" && this.steps[target].type !== "warmup") target--;
    for (let i = target; i < this.steps.length; i++) {
      this.outcomes.delete(i);
      this.entries.delete(i);
    }
    const item = stepItem(this.steps[target]);
    if (item !== null) this.skippedItems.delete(item);
    this.enter(target);
  }

  // Skips every remaining set of the current exercise, straight sets or circuit rounds alike.
  skipExercise() {
    const item = this.step ? stepItem(this.step) : null;
    if (item === null) return;
    this.skippedItems.add(item);
    this.steps.forEach((s, i) => {
      if (i >= this.index && s.type === "work" && s.item === item) this.outcomes.set(i, "skipped");
    });
    this.advance();
  }

  // Ending early counts every set not yet done as skipped, so auto-deload sees the real picture.
  endEarly() {
    this.steps.forEach((s, i) => {
      if (s.type === "work" && !this.outcomes.has(i)) this.outcomes.set(i, "skipped");
    });
    this.stop();
    this.emit();
  }

  addRest(seconds: number) {
    if (this.step?.type !== "rest") return;
    this.remaining += seconds * this.timeScale;
    this.stepLength += seconds * this.timeScale;
    this.emit();
  }

  adjustReps(entryIndex: number, delta: number) {
    const entry = this.entries.get(entryIndex);
    if (!entry) return;
    if (entry.seconds !== null) {
      this.entries.set(entryIndex, { ...entry, seconds: Math.max(0, entry.seconds + delta * 5) });
    } else {
      this.entries.set(entryIndex, { ...entry, reps: Math.max(0, (entry.reps ?? 0) + delta) });
    }
    this.emit();
  }

  // Weight change applies to the logged set and every later set of the same exercise.
  setWeight(kg: number | null, entryIndex: number) {
    const entry = this.entries.get(entryIndex);
    if (!entry) return;
    this.entries.set(entryIndex, { ...entry, weightKg: kg });
    this.weights.set(entry.item, kg);
    this.emit();
  }

  private tick() {
    const now = Date.now();
    const delta = (now - this.lastTick) / 1000;
    this.lastTick = now;
    if (this.isPaused || this.isFinished) return;
    this.elapsed += delta / this.timeScale;
    this.remaining -= delta;
    if (this.remaining <= 0) {
      this.record("done");
      this.advance();
    } else {
      this.emit();
    }
  }

  private record(outcome: Outcome) {
    const step = this.step;
    if (step?.type !== "work") return;
    this.outcomes.set(this.index, outcome);
    if (outcome === "done") {
      const { prescription: p, exercise } = this.plan.items[step.item];
      this.entries.set(this.index, {
        item: step.item, set: step.set, reps: p.reps, seconds: p.seconds,
        weightKg: isLoaded(exercise) ? this.weight(step.item) : null,
      });
    } else {
      this.entries.delete(this.index);
    }
  }

  private advance() {
    let next = this.index + 1;
    while (next < this.steps.length) {
      const s = this.steps[next];
      const item = stepItem(s);
      if (item === null || !this.skippedItems.has(item)) break;
      if (s.type === "work") this.outcomes.set(next, "skipped");
      next++;
    }
    if (next < this.steps.length) this.enter(next);
    else this.finish();
  }

  private enter(i: number) {
    this.index = i;
    const step = this.steps[i];
    let seconds: number;
    switch (step.type) {
      case "warmup": seconds = warmupSeconds; break;
      case "prepare": seconds = 10; break;
      case "work": seconds = workSeconds(this.plan.items[step.item].prescription); break;
      case "rest": seconds = step.seconds; break;
    }
    this.stepLength = seconds * this.timeScale;
    this.remaining = this.stepLength;
    this.onCue(step.type === "work" ? "work" : "light");
    this.emit();
  }

  private finish() {
    this.index = this.steps.length;
    this.isFinished = true;
    this.remaining = 0;
    this.stop();
    this.onCue("finish");
    this.emit();
  }
}
