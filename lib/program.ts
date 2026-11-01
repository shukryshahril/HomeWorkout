import { type Exercise, type Movement, catalog, exerciseById, isLoaded, isTimed, roleRestSeconds } from "./exercise";
import { type Gear, bodyweight, isBodyweightOnly, needsMet } from "./gear";
import { type Muscle, type MuscleMap, mergeMuscles } from "./muscle";

// The user's goal. Same yearly skeleton, different reps, rest, volume and session format.
export const routes = ["balanced", "strength", "muscle", "lean"] as const;
export type Route = (typeof routes)[number];

export const routeInfo: Record<Route, { name: string; summary: string }> = {
  balanced: { name: "Balanced", summary: "A bit of everything: strength, muscle and fitness." },
  strength: { name: "Strength", summary: "Fewer reps, longer rest, harder variations sooner." },
  muscle: { name: "Muscle", summary: "More sets, slow lowering, extra arm, chest and shoulder work." },
  lean: { name: "Lean & fit", summary: "Circuits with short rest and an extra conditioning day." },
};

export function isRoute(value: unknown): value is Route {
  return typeof value === "string" && (routes as readonly string[]).includes(value);
}

// Quarter of the training year. Blocks 1–3 rebuild, 4–6 build, 7–9 strength, 10–12 athletic, then it loops.
export const macroPhases = ["rebuild", "build", "strength", "athletic"] as const;
export type MacroPhase = (typeof macroPhases)[number];

export function macroForBlock(block: number): MacroPhase {
  return macroPhases[Math.floor(((block - 1) % 12) / 3)] ?? "rebuild";
}

export const macroInfo: Record<MacroPhase, { name: string; months: string; focus: string; baseTier: number }> = {
  // baseTier is the ladder rung each movement aims for in this phase, before route, level and per-movement adjustments.
  rebuild: { name: "Rebuild", months: "Months 1–3", focus: "Full-body sessions. Learn the patterns and build the habit.", baseTier: 2 },
  build: { name: "Build", months: "Months 4–6", focus: "Upper/lower split, more weekly volume, a conditioning day.", baseTier: 3 },
  strength: { name: "Strength", months: "Months 7–9", focus: "Hardest variations, fewer reps, slower tempo and pauses.", baseTier: 4 },
  athletic: { name: "Athletic", months: "Months 10–12", focus: "Jumps, swings, carries and conditioning on a strength base.", baseTier: 3 },
};

export type MovementOffsets = Partial<Record<Movement, number>>;

// Everything that shapes a plan besides the day number.
export type ProgramContext = {
  gear: Gear;
  level: number;
  block: number;
  route: Route;
  offsets: MovementOffsets;
};

export const contextYear = (c: ProgramContext) => Math.floor((c.block - 1) / 12) + 1;
export const contextBlockInYear = (c: ProgramContext) => ((c.block - 1) % 12) + 1;

export function targetTier(context: ProgramContext, movement: Movement): number {
  const macro = macroForBlock(context.block);
  let tier = macroInfo[macro].baseTier + (contextYear(context) - 1) + (context.offsets[movement] ?? 0);
  if (context.route === "strength" && macro !== "rebuild") tier += 1;
  if (context.level < 0) tier -= 1;
  else if (context.level >= 2) tier += 1;
  return Math.min(5, Math.max(1, tier));
}

export const phases = ["foundation", "build", "overload", "deload", "peak"] as const;
export type Phase = (typeof phases)[number];

export function phaseForDay(day: number): Phase {
  return phases[Math.min(Math.floor((day - 1) / 7), 4)];
}

export const phaseInfo: Record<Phase, { name: string; summary: string }> = {
  foundation: { name: "Foundation", summary: "Learn this block's variations. Base reps, 3 sets, leave 3 reps in reserve." },
  build: { name: "Build", summary: "More reps on every lift. Add load where the app suggests it." },
  overload: { name: "Overload", summary: "Extra set and a slower 3-second lowering. The hardest week." },
  deload: { name: "Deload", summary: "Volume drops to 2 sets so you recover and adapt." },
  peak: { name: "Peak test", summary: "Fresh legs, top rep targets. Beat your week 1 numbers." },
};

export function phaseWeekLabel(phase: Phase): string {
  return phase === "peak" ? "Days 29–30" : `Week ${phases.indexOf(phase) + 1}`;
}

type Slot = { movements: Movement[]; routes?: Route[] };

const slot = (...movements: Movement[]): Slot => ({ movements });
const only = (routes: Route[], ...movements: Movement[]): Slot => ({ movements, routes });

export type SessionKind =
  | "fullA" | "fullB" | "fullC" | "upperA" | "lowerA" | "upperB" | "lowerB"
  | "power" | "strengthA" | "strengthB" | "engine" | "rest";

export const sessionTitle: Record<SessionKind, string> = {
  fullA: "Squat & Push",
  fullB: "Hinge & Pull",
  fullC: "Legs & Engine",
  upperA: "Upper A",
  lowerA: "Lower A",
  upperB: "Upper B",
  lowerB: "Lower B",
  power: "Power",
  strengthA: "Strength A",
  strengthB: "Strength B",
  engine: "Engine",
  rest: "Rest & Recover",
};

export function weekCycle(macro: MacroPhase, route: Route): SessionKind[] {
  switch (macro) {
    case "rebuild":
      return route === "lean"
        ? ["fullA", "engine", "fullB", "rest", "fullC", "engine", "rest"]
        : ["fullA", "fullB", "rest", "fullC", "engine", "rest", "rest"];
    case "build":
    case "strength":
      return route === "strength"
        ? ["upperA", "lowerA", "rest", "upperB", "lowerB", "rest", "rest"]
        : ["upperA", "lowerA", "rest", "upperB", "lowerB", "engine", "rest"];
    case "athletic":
      return route === "lean"
        ? ["power", "strengthA", "engine", "rest", "strengthB", "engine", "rest"]
        : ["power", "strengthA", "rest", "engine", "strengthB", "rest", "rest"];
  }
}

// Every upper-body day pairs each push slot with a pull slot.
function slots(kind: SessionKind): Slot[] {
  const size: Route[] = ["balanced", "muscle"];
  const muscle: Route[] = ["muscle"];
  switch (kind) {
    case "fullA":
      return [slot("squat"), slot("pushH"), slot("pullH"), slot("pushV"), slot("pullV", "pullH"), slot("lunge"),
        only(muscle, "delts"), slot("core")];
    case "fullB":
      return [slot("hinge"), slot("pullV", "pullH"), slot("pushH"), slot("pullH"), only(size, "biceps"), slot("core")];
    case "fullC":
      return [slot("lunge"), slot("pushH"), slot("pullH"), slot("power", "hinge"), only(muscle, "triceps"),
        slot("conditioning"), slot("core")];
    case "upperA":
      return [slot("pushH"), slot("pullH"), slot("pushV"), slot("pullV", "pullH"), only(muscle, "chest"),
        only(size, "biceps"), only(size, "triceps")];
    case "lowerA":
      return [slot("squat"), slot("hinge"), slot("lunge"), only(size, "calves"), slot("core")];
    case "upperB":
      return [slot("pushV"), slot("pullV", "pullH"), slot("pushH"), slot("pullH"), only(size, "delts"),
        only(muscle, "triceps"), only(muscle, "biceps")];
    case "lowerB":
      return [slot("hinge"), slot("lunge"), slot("squat"), only(muscle, "calves"), slot("core"), slot("core")];
    case "power":
      return [slot("power", "conditioning"), slot("squat"), slot("pushH"), slot("pullH"), slot("conditioning"), slot("core")];
    case "strengthA":
      return [slot("squat"), slot("pushH"), slot("pullH"), slot("hinge"), slot("conditioning")];
    case "strengthB":
      return [slot("hinge"), slot("pushV"), slot("pullV", "pullH"), slot("lunge"), slot("core")];
    case "engine":
      return [slot("conditioning"), slot("lunge"), slot("power", "conditioning"), slot("core"), slot("conditioning")];
    case "rest":
      return [];
  }
}

function warmupIDs(kind: SessionKind): string[] {
  switch (kind) {
    case "upperA":
    case "upperB":
      return ["jumping-jack-warmup", "arm-circles", "cat-cow", "inchworm", "worlds-greatest-stretch"];
    case "fullB":
    case "fullC":
    case "lowerA":
    case "lowerB":
      return ["jumping-jack-warmup", "leg-swings", "hip-circles", "bodyweight-good-morning", "worlds-greatest-stretch", "inchworm"];
    case "rest":
      return [];
    default:
      return ["jumping-jack-warmup", "arm-circles", "hip-circles", "cat-cow", "worlds-greatest-stretch", "inchworm"];
  }
}

export type Prescription = {
  sets: number;
  reps: number | null;
  seconds: number | null;
  perSide: boolean;
  tempo: string | null;
  restSeconds: number;
  effort: string;
};

export function prescriptionTarget(p: Prescription): string {
  const side = p.perSide ? " / side" : "";
  return p.seconds !== null ? `${p.seconds}s${side}` : `${p.reps ?? 0}${side}`;
}

export const prescriptionLine = (p: Prescription) => `${p.sets} × ${prescriptionTarget(p)}`;

export function prescriptionPerSet(p: Prescription): string {
  const side = p.perSide ? " / side" : "";
  return p.seconds !== null ? `Hold ${p.seconds}s${side}` : `${p.reps ?? 0} reps${side}`;
}

// Expected time under work for one set, used to drive the guided timer.
export function workSeconds(p: Prescription): number {
  if (p.seconds !== null) return p.seconds * (p.perSide ? 2 : 1);
  const perRep = p.tempo ? p.tempo.split("-").map(Number).filter(Number.isInteger).reduce((a, b) => a + b, 0) : 2;
  return Math.max(20, (p.reps ?? 0) * Math.max(perRep, 2) * (p.perSide ? 2 : 1) + 5);
}

export type PlannedExercise = { exercise: Exercise; prescription: Prescription };

// One-session tweak driven by how the previous training session went.
export type SessionAdjustment = "none" | "push" | "ease" | "deload";

export const adjustmentBadge: Record<SessionAdjustment, string | null> = {
  none: null,
  push: "Rated easy · reps bumped",
  ease: "Rated very hard · more rest",
  deload: "Auto-deload · lighter session",
};

export const adjustmentExplanation: Record<SessionAdjustment, string | null> = {
  none: null,
  push: "You rated last session easy, so today pulls next week's rep target forward.",
  ease: "You rated last session very hard, so today holds reps where they were and adds 15s rest.",
  deload: "Last session was rated max effort or had many skipped sets, so today drops a set and the rep bump.",
};

export type DayPlan = {
  day: number;
  type: SessionKind;
  phase: Phase;
  macro: MacroPhase;
  items: PlannedExercise[];
  warmup: Exercise[];
  adjustment: SessionAdjustment;
  // Circuits run one round through every exercise, with short transitions, before repeating.
  isCircuit: boolean;
  // Week 1 for a long-break restart: bodyweight versions only, so joints and tendons catch up before load.
  isReentry: boolean;
};

export const circuitTransition = 15;
export const circuitRoundRest = 60;
export const warmupSeconds = 40;

export const isRestDay = (plan: DayPlan) => plan.type === "rest";
export const planRounds = (plan: DayPlan) => Math.max(0, ...plan.items.map((i) => i.prescription.sets));

export function planMuscles(plan: DayPlan): MuscleMap {
  return plan.items.reduce<MuscleMap>((map, item) => mergeMuscles(map, item.exercise.primary, item.exercise.secondary), {});
}

// Primary muscles ranked by how many exercises target them.
export function planFocus(plan: DayPlan): Muscle[] {
  const counts = new Map<Muscle, number>();
  for (const m of plan.items.flatMap((i) => i.exercise.primary)) counts.set(m, (counts.get(m) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([ma, a], [mb, b]) => (a !== b ? b - a : ma < mb ? -1 : ma > mb ? 1 : 0))
    .map(([m]) => m);
}

export const warmupMinutes = (plan: DayPlan) => Math.max(1, Math.floor((plan.warmup.length * warmupSeconds) / 60));

export function estimatedMinutes(plan: DayPlan): number {
  let work: number;
  if (plan.isCircuit) {
    const rounds = planRounds(plan);
    const round = plan.items.reduce((total, i) => total + workSeconds(i.prescription) + circuitTransition, 0);
    work = round * rounds + (rounds - 1) * circuitRoundRest;
  } else {
    work = plan.items.reduce((total, { prescription: p }) => total + p.sets * workSeconds(p) + p.sets * p.restSeconds, 0);
  }
  return Math.max(1, Math.round((work + plan.warmup.length * warmupSeconds) / 60));
}

export const programLength = 30;
export const minLevel = -2;
export const maxLevel = 4;

export function planDay(day: number, context: ProgramContext, adjustment: SessionAdjustment = "none"): DayPlan {
  const macro = macroForBlock(context.block);
  const kind = weekCycle(macro, context.route)[(day - 1) % 7];
  const phase = phaseForDay(day);
  const adjust = kind === "rest" ? "none" : adjustment;
  const isReentry = context.level <= minLevel && context.block === 1 && phase === "foundation"
    && !isBodyweightOnly(context.gear) && kind !== "rest";
  const pickContext = isReentry ? { ...context, gear: bodyweight } : context;

  const used = new Set<string>();
  const items: PlannedExercise[] = [];
  slots(kind).forEach((s, index) => {
    if (s.routes && !s.routes.includes(context.route)) return;
    const choice = pick(s.movements, pickContext, index, used);
    if (!choice) return;
    used.add(choice.id);
    items.push({ exercise: choice, prescription: prescription(choice, phase, context, adjust) });
  });
  const isCircuit = kind === "engine" || (context.route === "lean" && kind !== "rest");
  return {
    day, type: kind, phase, macro, items, adjustment: adjust, isCircuit, isReentry,
    warmup: warmupIDs(kind).map(exerciseById).filter((e): e is Exercise => e !== undefined),
  };
}

export function buildProgram(context: ProgramContext): DayPlan[] {
  return Array.from({ length: programLength }, (_, i) => planDay(i + 1, context));
}

const byTierThenIdDescending = (a: Exercise, b: Exercise) =>
  b.tier - a.tier || (b.id < a.id ? -1 : b.id > a.id ? 1 : 0);

// Picks the ladder rung for a slot: exercises at the target tier rotate block to block; a lone rung
// alternates with the one below it so every slot still changes; if nothing reaches the target, the
// hardest available rung is used.
export function pick(slotMovements: Movement[], context: ProgramContext, slotIndex: number, used: Set<string>): Exercise | undefined {
  for (const movement of slotMovements) {
    const candidates = catalog.filter((e) => e.movement === movement && needsMet(e.needs, context.gear) && !used.has(e.id));
    if (candidates.length === 0) continue;
    const target = targetTier(context, movement);
    const atTarget = candidates.filter((e) => e.tier === target);
    const belowTiers = candidates.filter((e) => e.tier < target).map((e) => e.tier);
    let band: Exercise[];
    if (atTarget.length >= 2) {
      band = atTarget;
    } else if (belowTiers.length > 0) {
      const below = Math.max(...belowTiers);
      band = [...atTarget, ...candidates.filter((e) => e.tier === below)];
    } else {
      const lowest = Math.min(...candidates.map((e) => e.tier));
      band = atTarget.length === 0 ? candidates.filter((e) => e.tier === lowest) : atTarget;
    }
    const ordered = [...band].sort(byTierThenIdDescending);
    return ordered[(context.block - 1 + slotIndex) % ordered.length];
  }
  return undefined;
}

export function prescription(exercise: Exercise, phase: Phase, context: ProgramContext,
  adjustment: SessionAdjustment = "none"): Prescription {
  let sets: number;
  let stepMultiplier: number;
  let tempo: string | null;
  let restDelta = 0;
  let effort: string;
  const { level, route } = context;
  const macro = macroForBlock(context.block);
  const loaded = isLoaded(exercise);

  switch (phase) {
    case "foundation":
      sets = 3; stepMultiplier = 0; tempo = "2-0-1";
      effort = "Leave 3 reps in reserve";
      break;
    case "build":
      sets = 3; stepMultiplier = 1; tempo = "2-0-1";
      effort = loaded ? "2 in reserve · go heavier if week 1 was easy" : "Leave 2 reps in reserve";
      break;
    case "overload":
      sets = 4; stepMultiplier = 1; tempo = "3-1-1"; restDelta = 15;
      effort = loaded ? "1 in reserve · heaviest week" : "Slow 3s lowering · 1 in reserve";
      break;
    case "deload":
      sets = 2; stepMultiplier = 0; tempo = "2-0-1"; restDelta = -15;
      effort = loaded ? "Drop to ~70% of week 3 load" : "Easy pace · crisp reps";
      break;
    case "peak":
      sets = 3; stepMultiplier = 2; tempo = "2-0-1";
      effort = "Test · beat your week 1 numbers";
      break;
  }
  stepMultiplier += Math.min(2, Math.max(-2, level));
  // Lowest level also drops a set through the loading weeks of the first block.
  if (level <= minLevel && context.block === 1 && phase !== "deload" && phase !== "peak") sets = Math.max(2, sets - 1);
  if (level < 0 && loaded && context.block === 1 && (phase === "foundation" || phase === "build")) {
    effort = "Light weight · stop 4 reps short of failure";
  }

  let repScale = 1;
  switch (route) {
    case "balanced":
      break;
    case "strength":
      repScale *= 0.6;
      restDelta += 45;
      if (phase !== "deload") effort = loaded ? "Heavy · 1–2 reps in reserve" : "Hardest clean reps you can do";
      break;
    case "muscle":
      if (tempo === "2-0-1") tempo = "3-0-1";
      if (exercise.role === "accessory" && phase !== "deload") sets += 1;
      break;
    case "lean":
      repScale *= 1.2;
      break;
  }
  if (macro === "strength") {
    repScale *= 0.75;
    restDelta += 30;
    if (phase === "foundation" || phase === "build") tempo = "3-1-1";
  }

  if (exercise.role === "conditioning" || exercise.role === "power") tempo = null;
  if (exercise.role === "power") {
    effort = "Explode up, reset fully each rep";
    repScale = Math.min(repScale, 1);
  }
  if (isTimed(exercise)) {
    effort = {
      foundation: "Clean position, steady breathing",
      build: "Longer holds · brace harder",
      overload: "Longer holds · brace harder",
      deload: "Easy holds · recover",
      peak: "Test · hold the full time",
    }[phase];
  }
  switch (adjustment) {
    case "none":
      break;
    case "push":
      stepMultiplier += 1;
      effort = "Rated easy last time · one step harder";
      break;
    case "ease":
      stepMultiplier = Math.max(0, stepMultiplier - 1);
      restDelta += 15;
      effort = "Rated very hard · same reps, longer rest";
      break;
    case "deload":
      sets = Math.max(2, sets - 1);
      stepMultiplier = Math.max(0, stepMultiplier - 1);
      effort = "Auto-deload · last session was rough";
      break;
  }

  const rest = Math.max(20, roleRestSeconds[exercise.role] + restDelta);
  const { base, step } = exercise.kind;
  if (exercise.kind.type === "reps") {
    const reps = (base + step * stepMultiplier) * repScale;
    const cap = exercise.role === "power" ? 10 : 30;
    return { sets, reps: Math.min(cap, Math.max(3, Math.round(reps))), seconds: null, perSide: exercise.perSide,
      tempo, restSeconds: rest, effort };
  }
  const seconds = (base + step * stepMultiplier) * (route === "strength" ? 0.85 : repScale);
  return { sets, reps: null, seconds: Math.min(90, Math.max(15, Math.round(seconds))), perSide: exercise.perSide,
    tempo: null, restSeconds: rest, effort };
}
