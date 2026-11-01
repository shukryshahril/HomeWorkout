import { type GearNeeds, needsLoaded } from "./gear";
import { type Muscle, type MuscleMap, mergeMuscles } from "./muscle";

export type ExerciseKind = { type: "reps" | "timed"; base: number; step: number };

const reps = (base: number, step: number): ExerciseKind => ({ type: "reps", base, step });
const timed = (base: number, step: number): ExerciseKind => ({ type: "timed", base, step });

export type ExerciseRole = "compound" | "accessory" | "conditioning" | "power";

export const roleRestSeconds: Record<ExerciseRole, number> = {
  compound: 75,
  accessory: 45,
  conditioning: 30,
  power: 60,
};

// Movement pattern an exercise trains. Each pattern is a ladder of variations ordered by `tier`.
export const movements = [
  "squat", "hinge", "lunge", "pushH", "pushV", "pullH", "pullV",
  "chest", "delts", "biceps", "triceps", "core", "calves",
  "conditioning", "power", "warmup",
] as const;

export type Movement = (typeof movements)[number];

export const movementName: Record<Movement, string> = {
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Single leg",
  pushH: "Push",
  pushV: "Overhead push",
  pullH: "Row",
  pullV: "Vertical pull",
  chest: "Chest",
  delts: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
  calves: "Calves",
  conditioning: "Conditioning",
  power: "Power",
  warmup: "Warm-up",
};

// Patterns shown on the progress screen as ladders.
export const ladderMovements: Movement[] = ["squat", "hinge", "lunge", "pushH", "pushV", "pullH", "pullV", "core"];

export function isMovement(value: string): value is Movement {
  return (movements as readonly string[]).includes(value);
}

export type Exercise = {
  id: string;
  name: string;
  movement: Movement;
  // 1 (easiest) to 5 (hardest) within its movement.
  tier: number;
  kind: ExerciseKind;
  role: ExerciseRole;
  perSide: boolean;
  needs: GearNeeds;
  primary: Muscle[];
  secondary: Muscle[];
  videoID: string;
  videoTitle: string;
  cues: string[];
};

export const isLoaded = (exercise: Exercise) => needsLoaded(exercise.needs);
export const isTimed = (exercise: Exercise) => exercise.kind.type === "timed";
export const exerciseMuscles = (exercise: Exercise): MuscleMap => mergeMuscles({}, exercise.primary, exercise.secondary);

type Details = {
  tier: number;
  kind: ExerciseKind;
  role: ExerciseRole;
  perSide?: boolean;
  needs?: GearNeeds;
  primary: Muscle[];
  secondary?: Muscle[];
  video: string;
  title: string;
  cues: string[];
};

function ex(id: string, name: string, movement: Movement, d: Details): Exercise {
  return {
    id, name, movement, tier: d.tier, kind: d.kind, role: d.role, perSide: d.perSide ?? false, needs: d.needs ?? {},
    primary: d.primary, secondary: d.secondary ?? [], videoID: d.video, videoTitle: d.title, cues: d.cues,
  };
}

const db1: GearNeeds = { dumbbells: 1 };
const db2: GearNeeds = { dumbbells: 2 };
const bench: GearNeeds = { bench: true };
const db1Bench: GearNeeds = { dumbbells: 1, bench: true };
const db2Bench: GearNeeds = { dumbbells: 2, bench: true };

// Video IDs verified against YouTube oEmbed (HTTP 200, title matches) on 2026-10-15 and 2026-10-16.
const squat: Exercise[] = [
  ex("wall-sit", "Wall Sit", "squat", { tier: 1, kind: timed(30, 10), role: "accessory",
     primary: ["quads"], secondary: ["glutes"],
     video: "JaZNYM3zAP0", title: "How To Do a Wall Sit · Well+Good",
     cues: ["Back flat on the wall", "Thighs parallel to the floor", "Knees over ankles, breathe steadily"] }),
  ex("squat", "Bodyweight Squat", "squat", { tier: 1, kind: reps(15, 3), role: "compound",
     primary: ["quads", "glutes"], secondary: ["hamstrings", "abs"],
     video: "CKcDiJnLaLY", title: "How to Do Bodyweight Squats Correctly · Patience Consistency",
     cues: ["Feet shoulder-width, toes slightly out", "Knees track over toes", "Hips to knee height or below, chest tall"] }),
  ex("goblet-squat", "Goblet Squat", "squat", { tier: 2, kind: reps(10, 2), role: "compound", needs: db1,
     primary: ["quads", "glutes"], secondary: ["abs", "upperBack"],
     video: "zsN2WvklwDk", title: "Dumbbell Goblet Squat: Correct Form · Janice Liang",
     cues: ["Hold the dumbbell vertical at the chest", "Elbows inside the knees at the bottom", "Stand by driving the floor away"] }),
  ex("kb-goblet-squat", "Kettlebell Goblet Squat", "squat", { tier: 2, kind: reps(10, 2), role: "compound",
     needs: { kettlebells: 1 }, primary: ["quads", "glutes"], secondary: ["abs", "upperBack"],
     video: "sFvas9RkSlc", title: "How to Do a Goblet Squat Properly · Mariela Ramos",
     cues: ["Hold the bell by the horns at the chest", "Sit between the heels", "Chest up the whole way"] }),
  ex("db-sumo-squat", "Dumbbell Sumo Squat", "squat", { tier: 2, kind: reps(12, 2), role: "compound", needs: db1,
     primary: ["glutes", "quads"], secondary: ["hamstrings"],
     video: "MwNY25e4QEA", title: "How To: Dumbbell Sumo Squat · Live Lean TV",
     cues: ["Wide stance, toes turned out", "Dumbbell hangs between the legs", "Push knees out as you sit down"] }),
  ex("db-front-squat", "Dumbbell Front Squat", "squat", { tier: 3, kind: reps(10, 2), role: "compound", needs: db2,
     primary: ["quads", "glutes"], secondary: ["abs", "upperBack"],
     video: "YF3FAHS2j1M", title: "Dumbbell Front Squat (2 DBs): Proper Form · BuiltLean",
     cues: ["Dumbbells rest on the shoulders, elbows high", "Torso stays upright", "Full depth, drive straight up"] }),
  ex("cossack-squat", "Cossack Squat", "squat", { tier: 3, kind: reps(6, 1), role: "compound", perSide: true,
     primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"],
     video: "51slmzoEVt8", title: "How To Do A Cossack Squat · PureGym",
     cues: ["Very wide stance", "Sit into one hip, other leg straight with toes up", "Heel of the working leg stays down"] }),
  ex("single-leg-box-squat", "Single-leg Box Squat", "squat", { tier: 4, kind: reps(5, 1), role: "compound", perSide: true,
     primary: ["quads", "glutes"], secondary: ["abs", "calves"],
     video: "N_qgwwbqjI4", title: "How To: Pistol Squat To Bench · Live Lean TV",
     cues: ["Stand on one leg in front of a bench or chair", "Sit back slowly until you touch", "Stand up without rocking"] }),
];

const hinge: Exercise[] = [
  ex("glute-bridge", "Glute Bridge", "hinge", { tier: 1, kind: reps(15, 3), role: "compound",
     primary: ["glutes"], secondary: ["hamstrings", "lowerBack"],
     video: "KI6fjDqGZh4", title: "Glute Bridge: How To · Born Fitness",
     cues: ["Tuck the pelvis before lifting", "Drive through the heels", "Squeeze at the top, ribs down"] }),
  ex("single-leg-glute-bridge", "Single-leg Glute Bridge", "hinge", { tier: 2, kind: reps(10, 2), role: "compound", perSide: true,
     primary: ["glutes"], secondary: ["hamstrings"],
     video: "nat5dN0Kuao", title: "How To Do The Single-Leg Glute Bridge · Onnit",
     cues: ["One foot planted, other knee to chest", "Hips stay level as you lift", "Pause at the top"] }),
  ex("hip-thrust", "Hip Thrust", "hinge", { tier: 2, kind: reps(15, 3), role: "compound", needs: bench,
     primary: ["glutes"], secondary: ["hamstrings"],
     video: "oQg-lJkQYKI", title: "Bodyweight Hip Thrust · Side Quest Fitness",
     cues: ["Upper back on the bench edge", "Chin tucked, ribs down", "Shins vertical at the top"] }),
  ex("single-leg-rdl", "Single-leg Romanian Deadlift", "hinge", { tier: 2, kind: reps(8, 2), role: "compound", perSide: true,
     primary: ["hamstrings", "glutes"], secondary: ["lowerBack", "calves"],
     video: "gz9l8UA_KXs", title: "How to Perform Single Leg Romanian Deadlifts · Buff Dudes",
     cues: ["Soft standing knee", "Hips square to the floor", "Reach long from head to back heel"] }),
  ex("db-rdl", "Dumbbell Romanian Deadlift", "hinge", { tier: 2, kind: reps(10, 2), role: "compound", needs: db2,
     primary: ["hamstrings", "glutes"], secondary: ["lowerBack", "forearms"],
     video: "hQgFixeXdZo", title: "Dumbbell Romanian Deadlift for Beginners · J2FIT",
     cues: ["Soft knees, push the hips back", "Dumbbells slide down the thighs", "Stop at mid-shin, squeeze glutes to stand"] }),
  ex("db-hip-thrust", "Dumbbell Hip Thrust", "hinge", { tier: 3, kind: reps(12, 2), role: "compound", needs: db1Bench,
     primary: ["glutes"], secondary: ["hamstrings"],
     video: "T55MKVmc0G0", title: "Dumbbell Hip Thrust Form · Lift With Michelle",
     cues: ["Dumbbell sits on the hip crease", "Drive through the heels", "Hold the top for a second"] }),
  ex("db-single-leg-rdl", "Dumbbell Single-leg RDL", "hinge", { tier: 3, kind: reps(8, 2), role: "compound", perSide: true, needs: db1,
     primary: ["hamstrings", "glutes"], secondary: ["lowerBack", "abs"],
     video: "Zfr6wizR8rs", title: "The BEST Single-Leg RDL Tutorial · Squat University",
     cues: ["Dumbbell in the hand opposite the standing leg", "Hinge until you feel the hamstring", "Stand tall without twisting"] }),
];

const lunge: Exercise[] = [
  ex("split-squat", "Split Squat", "lunge", { tier: 1, kind: reps(10, 2), role: "compound", perSide: true,
     primary: ["quads", "glutes"], secondary: ["hamstrings"],
     video: "qtblVwEz2a8", title: "Exercise Tutorial: Bodyweight Split Squat · Travis Tarrant",
     cues: ["Long staggered stance, feet stay put", "Drop the back knee straight down", "Front heel drives you up"] }),
  ex("reverse-lunge", "Reverse Lunge", "lunge", { tier: 2, kind: reps(8, 2), role: "compound", perSide: true,
     primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"],
     video: "ALl174GTuoY", title: "Reverse Lunge Form for Beginners · Steve & Latifah",
     cues: ["Step back long enough for a 90° front knee", "Torso tall, core braced", "Push through the front heel to stand"] }),
  ex("lateral-lunge", "Lateral Lunge", "lunge", { tier: 2, kind: reps(8, 2), role: "compound", perSide: true,
     primary: ["quads", "glutes"], secondary: ["hamstrings"],
     video: "apsp_uuXZTU", title: "How To Do Lateral Lunges · PureGym",
     cues: ["Big step to the side", "Sit into that hip, other leg straight", "Push back to the middle"] }),
  ex("walking-lunge", "Walking Lunge", "lunge", { tier: 2, kind: reps(10, 2), role: "compound", perSide: true,
     primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"],
     video: "Pbmj6xPo-Hw", title: "Walking Lunges Exercise Tutorial · Buff Dudes",
     cues: ["Step forward into a lunge", "Back knee hovers above the floor", "Drive through and step straight into the next"] }),
  ex("step-up", "Bench Step-up", "lunge", { tier: 2, kind: reps(8, 2), role: "compound", perSide: true, needs: bench,
     primary: ["quads", "glutes"], secondary: ["calves", "hamstrings"],
     video: "qXQDZOrc7TQ", title: "How to Do the Dumbbell Box Step-Up Correctly · Santiago Tobon",
     cues: ["Whole foot on the bench", "Drive through the top heel, do not push off the floor", "Step down with control"] }),
  ex("db-reverse-lunge", "Dumbbell Reverse Lunge", "lunge", { tier: 3, kind: reps(8, 2), role: "compound", perSide: true, needs: db2,
     primary: ["quads", "glutes"], secondary: ["hamstrings", "forearms"],
     video: "MyqQRJ2lW7Q", title: "Dumbbell Reverse Lunges · Team Evolve",
     cues: ["Dumbbells at the sides, arms long", "Step back, lower the back knee", "Front heel drives you up"] }),
  ex("bulgarian-split-squat", "Bulgarian Split Squat", "lunge", { tier: 3, kind: reps(8, 2), role: "compound", perSide: true, needs: bench,
     primary: ["quads", "glutes"], secondary: ["hamstrings", "abs"],
     video: "VPhhE6bBzZE", title: "How To Do Bulgarian Split Squats Correctly · Jack Hanrahan Fitness",
     cues: ["Rear foot laces-down on the bench", "Drop the back knee straight down", "Hold dumbbells once bodyweight is easy"] }),
];

const push: Exercise[] = [
  ex("incline-push-up", "Incline Push-up", "pushH", { tier: 1, kind: reps(10, 2), role: "compound",
     primary: ["chest"], secondary: ["triceps", "shoulders", "abs"],
     video: "y8I66lWtNB8", title: "Incline Push Up: How To · Born Fitness",
     cues: ["Hands on a bench, table or counter", "Body one straight line", "Lower the chest to the edge"] }),
  ex("knee-push-up", "Knee Push-up", "pushH", { tier: 1, kind: reps(10, 2), role: "compound",
     primary: ["chest"], secondary: ["triceps", "shoulders"],
     video: "6DFAEphpiE0", title: "How to Do a Knee Push Up Correctly · BACK2BASICS",
     cues: ["Straight line from knees to head", "Elbows about 45° from the ribs", "Chest all the way down"] }),
  ex("push-up", "Push-up", "pushH", { tier: 2, kind: reps(8, 2), role: "compound",
     primary: ["chest"], secondary: ["triceps", "shoulders", "abs"],
     video: "mECzqUIDWfU", title: "How to do a proper push-up · Yellow Dude",
     cues: ["Hands under shoulders, body one straight line", "Elbows about 45° from the ribs", "Chest to a fist's height off the floor"] }),
  ex("db-floor-press", "Dumbbell Floor Press", "pushH", { tier: 2, kind: reps(10, 2), role: "compound", needs: db2,
     primary: ["chest"], secondary: ["triceps", "shoulders"],
     video: "T0Y3OBF1bNI", title: "How To Do A Dumbbell Floor Press · PureGym",
     cues: ["Knees bent, feet flat", "Lower until upper arms touch the floor", "Pause, then press"] }),
  ex("db-bench", "Dumbbell Bench Press", "pushH", { tier: 2, kind: reps(10, 2), role: "compound", needs: db2Bench,
     primary: ["chest"], secondary: ["triceps", "shoulders"],
     video: "5Y3VZsLb1Ys", title: "How To Do Dumbbell Bench Press Correctly · Jack Hanrahan Fitness",
     cues: ["Shoulder blades pinched into the bench", "Lower to mid-chest, elbows ~45°", "Press up and slightly in"] }),
  ex("decline-push-up", "Decline Push-up", "pushH", { tier: 3, kind: reps(8, 2), role: "compound",
     primary: ["chest", "shoulders"], secondary: ["triceps", "abs"],
     video: "9yoySai9DuI", title: "How To Do A Decline Push Up · Live Lean TV",
     cues: ["Feet on a bench or chair", "Hips in line, no sag", "Lower the forehead past the hands"] }),
  ex("db-single-arm-bench", "Single-arm Dumbbell Press", "pushH", { tier: 3, kind: reps(8, 2), role: "compound", perSide: true, needs: db1Bench,
     primary: ["chest"], secondary: ["triceps", "abs", "obliques"],
     video: "LgCbv-u73vg", title: "Single Arm Dumbbell Flat Bench Press · Live Lean TV",
     cues: ["Free hand on the ribs, brace hard", "Do not let the torso roll", "Press straight over the shoulder"] }),
  ex("db-close-grip-press", "Dumbbell Crush Press", "pushH", { tier: 3, kind: reps(10, 2), role: "compound", needs: db2,
     primary: ["chest", "triceps"], secondary: ["shoulders"],
     video: "4Z6reBHE-20", title: "How To Do A Dumbbell Crush Press · Rich Hill",
     cues: ["Press the dumbbells together the whole time", "Lower to the lower chest", "Elbows stay close"] }),
  ex("diamond-push-up", "Diamond Push-up", "pushH", { tier: 3, kind: reps(8, 2), role: "compound",
     primary: ["triceps", "chest"], secondary: ["shoulders", "abs"],
     video: "ZR5U3sb-KeE", title: "How to Perform Diamond Push Ups · Buff Dudes",
     cues: ["Hands together under the chest", "Elbows track back", "Full range, chest to hands"] }),
  ex("archer-push-up", "Archer Push-up", "pushH", { tier: 4, kind: reps(5, 1), role: "compound", perSide: true,
     primary: ["chest"], secondary: ["triceps", "shoulders", "abs"],
     video: "A0r8ploEnZY", title: "Archer Push Ups | Correct Form Tutorial · Victory Calisthenics",
     cues: ["Very wide hands", "Shift to one side, other arm straight", "Keep hips level"] }),
];

const overhead: Exercise[] = [
  ex("pike-push-up", "Pike Push-up", "pushV", { tier: 2, kind: reps(6, 2), role: "compound",
     primary: ["shoulders"], secondary: ["triceps", "traps"],
     video: "3r3tvRF1tVA", title: "Pike Push Up Tutorial · Vitaly Pavlenko",
     cues: ["Hips high, body an upside-down V", "Lower the head ahead of the hands", "Press back up and away"] }),
  ex("db-shoulder-press", "Dumbbell Shoulder Press", "pushV", { tier: 2, kind: reps(8, 2), role: "compound", needs: db2,
     primary: ["shoulders"], secondary: ["triceps", "traps"],
     video: "WKEl69bIGus", title: "How to Do the Seated Dumbbell Shoulder Press · All Strength Training",
     cues: ["Sit tall on the bench or stand braced", "Start at ear height, press overhead", "Do not arch the low back"] }),
  ex("elevated-pike-push-up", "Elevated Pike Push-up", "pushV", { tier: 3, kind: reps(6, 1), role: "compound",
     primary: ["shoulders"], secondary: ["triceps", "traps", "abs"],
     video: "whTTE5e0fNo", title: "Pike Push-up (feet elevated) · Maximum Potential Calisthenics",
     cues: ["Feet on a bench or chair", "Hips stacked over the shoulders", "Head travels ahead of the hands"] }),
  ex("arnold-press", "Arnold Press", "pushV", { tier: 3, kind: reps(8, 2), role: "compound", needs: db2,
     primary: ["shoulders"], secondary: ["triceps"],
     video: "6Z15_WdXmVw", title: "Arnold Press · Buff Dudes",
     cues: ["Start palms facing you at chin height", "Rotate as you press", "Reverse the rotation on the way down"] }),
];

const pull: Exercise[] = [
  ex("superman", "Superman", "pullH", { tier: 1, kind: reps(10, 2), role: "accessory",
     primary: ["lowerBack"], secondary: ["glutes", "upperBack"],
     video: "z6PJMT2y8GQ", title: "Exercise Tutorial - Superman · XHIT Daily",
     cues: ["Lift arms and legs together", "Pause two seconds at the top", "Neck neutral, eyes on the floor"] }),
  ex("prone-ytw", "Prone Y-T-W Raise", "pullH", { tier: 1, kind: reps(8, 2), role: "accessory",
     primary: ["upperBack"], secondary: ["traps", "shoulders"],
     video: "CFt3WjCBbpc", title: "Prone W, T, Y Scapular Retraction Exercise · Peak Form Health",
     cues: ["Lie face down, forehead on a towel", "Lift arms into a Y, then T, then W", "Squeeze the shoulder blades, small lifts"] }),
  ex("db-row", "One-arm Dumbbell Row", "pullH", { tier: 2, kind: reps(10, 2), role: "compound", perSide: true, needs: db1,
     primary: ["lats", "upperBack"], secondary: ["biceps", "shoulders"],
     video: "fURsHPHgssI", title: "Single-Arm Dumbbell Row on a Bench · The Healthy Habit",
     cues: ["Brace a hand on a bench, chair or knee", "Flat back, no torso twist", "Pull the elbow to the hip"] }),
  ex("band-row", "Band Bent-over Row", "pullH", { tier: 2, kind: reps(12, 2), role: "compound", needs: { band: true },
     primary: ["lats", "upperBack"], secondary: ["biceps", "lowerBack"],
     video: "Y3H17rshgZE", title: "Resistance Band Bent Over Row · Live Lean TV",
     cues: ["Stand on the band, hinge to ~45°", "Row to the lower ribs", "Pause and squeeze each rep"] }),
  ex("db-chest-supported-row", "Chest-supported Row", "pullH", { tier: 2, kind: reps(10, 2), role: "compound", needs: db2Bench,
     primary: ["upperBack", "lats"], secondary: ["biceps", "shoulders"],
     video: "Nx0TzjgsI-0", title: "How To Do An Incline Dumbbell Row · PureGym",
     cues: ["Chest on the bench, feet planted", "Pull elbows back past the ribs", "Lower all the way, shoulders forward"] }),
  ex("db-bent-over-row", "Dumbbell Bent-over Row", "pullH", { tier: 3, kind: reps(10, 2), role: "compound", needs: db2,
     primary: ["lats", "upperBack"], secondary: ["biceps", "lowerBack"],
     video: "6gvmcqr226U", title: "How To Do A Dumbbell Bent Over Row · PureGym",
     cues: ["Hinge to about 45°, flat back", "Row both dumbbells to the hips", "No jerking from the legs"] }),
  ex("renegade-row", "Renegade Row", "pullH", { tier: 4, kind: reps(6, 1), role: "compound", perSide: true, needs: db2,
     primary: ["lats", "abs"], secondary: ["upperBack", "obliques", "chest"],
     video: "F68p7cJFtOI", title: "How to do Renegade Rows · Studio SWEAT",
     cues: ["Plank on the dumbbells, feet wide", "Row one side without rotating the hips", "Plant it quietly, switch"] }),
  ex("db-pullover", "Dumbbell Pullover", "pullV", { tier: 2, kind: reps(10, 2), role: "compound", needs: db1Bench,
     primary: ["lats"], secondary: ["chest", "triceps"],
     video: "Ydpy886udzo", title: "How to Perform Dumbbell Pullovers · Buff Dudes",
     cues: ["Upper back across the bench", "Lower behind the head with soft elbows", "Pull back over the chest using the lats"] }),
  ex("pull-up", "Pull-up", "pullV", { tier: 3, kind: reps(4, 1), role: "compound", needs: { pullUpBar: true },
     primary: ["lats"], secondary: ["biceps", "upperBack", "forearms"],
     video: "9yVGh3XbJ34", title: "How to do a Pull-Up · NASM",
     cues: ["Start from a dead hang, shoulders down", "Drive elbows to the ribs", "Slow negatives if full reps run out"] }),
];

const accessories: Exercise[] = [
  ex("db-fly", "Dumbbell Fly", "chest", { tier: 2, kind: reps(10, 2), role: "accessory", needs: db2Bench,
     primary: ["chest"], secondary: ["shoulders"],
     video: "eozdVDA78K0", title: "How To: Dumbbell Flys On A Flat Bench · ScottHermanFitness",
     cues: ["Slight bend in the elbows, locked in", "Open wide until you feel the stretch", "Hug a big tree on the way up"] }),
  ex("band-pull-apart", "Band Pull-apart", "delts", { tier: 1, kind: reps(15, 3), role: "accessory", needs: { band: true },
     primary: ["upperBack"], secondary: ["shoulders", "traps"],
     video: "WqdNDTTe-9g", title: "Resistance Band Pull Apart · FIT.nl",
     cues: ["Arms straight at shoulder height", "Pull to the chest, squeeze the blades", "Shoulders away from the ears"] }),
  ex("db-rear-delt-fly", "Rear Delt Fly", "delts", { tier: 2, kind: reps(12, 2), role: "accessory", needs: db2,
     primary: ["shoulders", "upperBack"], secondary: ["traps"],
     video: "UO_v23hHAdM", title: "Bent Over Dumbbell Rear Delt Flyes · Team Evolve",
     cues: ["Hinge forward, flat back", "Lead with the elbows, out to the sides", "Light weight, slow lowering"] }),
  ex("db-lateral-raise", "Lateral Raise", "delts", { tier: 2, kind: reps(12, 2), role: "accessory", needs: db2,
     primary: ["shoulders"], secondary: ["traps"],
     video: "1ovNfOjGN8Q", title: "Full ROM Dumbbell Lateral Raise · J2FIT",
     cues: ["Slight lean forward", "Raise out to the sides to shoulder height", "No swinging, control the drop"] }),
  ex("db-curl", "Dumbbell Curl", "biceps", { tier: 1, kind: reps(10, 2), role: "accessory", needs: db1,
     primary: ["biceps"], secondary: ["forearms"],
     video: "93R8V6uvwHc", title: "How to Do a Bicep Curl Properly · Epseia Plaza",
     cues: ["Elbows pinned to the sides", "No swinging the torso", "Lower slower than you lift"] }),
  ex("hammer-curl", "Hammer Curl", "biceps", { tier: 2, kind: reps(10, 2), role: "accessory", needs: db1,
     primary: ["biceps", "forearms"],
     video: "CFBZ4jN1CMI", title: "How to do a Dumbbell Hammer Curl · NASM",
     cues: ["Palms face each other", "Elbows still", "Squeeze at the top"] }),
  ex("db-overhead-triceps", "Overhead Triceps Extension", "triceps", { tier: 1, kind: reps(10, 2), role: "accessory", needs: db1,
     primary: ["triceps"],
     video: "x-Sd9xTfus0", title: "Overhead Dumbbell Triceps Extension · J2FIT",
     cues: ["Hold one dumbbell overhead with both hands", "Elbows point forward, not out", "Lower behind the head, press up"] }),
  ex("bench-dip", "Bench Dip", "triceps", { tier: 2, kind: reps(10, 2), role: "accessory", needs: bench,
     primary: ["triceps"], secondary: ["chest", "shoulders"],
     video: "zcHaDdf4sEM", title: "How to do a triceps dip on a bench · Rehab My Patient",
     cues: ["Grip the front edge of the bench", "Back close to the bench", "Lower to 90° at the elbow, no deeper"] }),
  ex("db-skull-crusher", "Dumbbell Skull Crusher", "triceps", { tier: 2, kind: reps(10, 2), role: "accessory", needs: db1,
     primary: ["triceps"],
     video: "8ncEJDm7Cig", title: "Dumbbell Skull Crusher Tutorial · Lean Physique Lab",
     cues: ["Lie on the bench or floor", "Upper arms vertical and still", "Lower beside the head, extend"] }),
  ex("calf-raise", "Single-leg Calf Raise", "calves", { tier: 1, kind: reps(12, 3), role: "accessory", perSide: true,
     primary: ["calves"],
     video: "IphGZ8OlfYg", title: "How To Do A Single Leg Calf Raise · PureGym",
     cues: ["Ball of the foot on a step", "Full stretch at the bottom", "Pause at the top"] }),
];

const core: Exercise[] = [
  ex("plank", "Plank", "core", { tier: 1, kind: timed(30, 10), role: "accessory",
     primary: ["abs"], secondary: ["obliques", "shoulders"],
     video: "mwlp75MS6Rg", title: "How to do a Plank · NASM",
     cues: ["Elbows under shoulders", "Squeeze glutes, tuck the pelvis", "Breathe, do not hold your breath"] }),
  ex("dead-bug", "Dead Bug", "core", { tier: 1, kind: reps(8, 2), role: "accessory", perSide: true,
     primary: ["abs"], secondary: ["obliques"],
     video: "-gRN_JyVTLY", title: "How To Do The Dead Bug Correctly · Jack Hanrahan Fitness",
     cues: ["Low back pressed into the floor", "Extend opposite arm and leg slowly", "Exhale as you reach"] }),
  ex("bird-dog", "Bird Dog", "core", { tier: 1, kind: reps(8, 2), role: "accessory", perSide: true,
     primary: ["abs", "lowerBack"], secondary: ["glutes", "shoulders"],
     video: "Y_NGGmPH8zA", title: "How to Do a Bird Dog Correctly · BACK2BASICS",
     cues: ["Hands under shoulders, knees under hips", "Reach opposite arm and leg long", "Hips stay level, pause"] }),
  ex("side-plank", "Side Plank", "core", { tier: 2, kind: timed(20, 5), role: "accessory", perSide: true,
     primary: ["obliques"], secondary: ["abs", "shoulders", "glutes"],
     video: "44ND4bOB-T0", title: "How to do a Side Plank · NASM",
     cues: ["Elbow under the shoulder", "Hips high, body in one line", "Hold both sides"] }),
  ex("plank-shoulder-tap", "Plank Shoulder Tap", "core", { tier: 2, kind: reps(10, 2), role: "accessory", perSide: true,
     primary: ["abs", "obliques"], secondary: ["shoulders"],
     video: "eT93C-xUZI8", title: "How to Do Plank Shoulder Taps · Spine Body Collective",
     cues: ["High plank, feet wide", "Tap the opposite shoulder", "Hips do not rock"] }),
  ex("leg-raise", "Lying Leg Raise", "core", { tier: 2, kind: reps(10, 2), role: "accessory",
     primary: ["abs"], secondary: ["obliques"],
     video: "sY2ZgV2Sj_s", title: "Lying Leg Raise Exercise · FIT.nl",
     cues: ["Low back stays down", "Legs straight, lower slowly", "Stop before the back arches"] }),
  ex("bicycle-crunch", "Bicycle Crunch", "core", { tier: 2, kind: reps(12, 3), role: "accessory", perSide: true,
     primary: ["obliques", "abs"],
     video: "1we3bh9uhqY", title: "How to do a Bicycle Crunch · Tone and Tighten",
     cues: ["Hands light behind the head", "Elbow toward the opposite knee", "Slow and controlled"] }),
  ex("hollow-hold", "Hollow Hold", "core", { tier: 3, kind: timed(20, 5), role: "accessory",
     primary: ["abs"], secondary: ["obliques"],
     video: "Z7Z4dPtPG9k", title: "Perfect Hollow Hold Progressions · The Movement Athlete",
     cues: ["Low back glued to the floor", "Arms and legs long, shoulders up", "Bend the knees if the back lifts"] }),
  ex("hanging-knee-raise", "Hanging Knee Raise", "core", { tier: 3, kind: reps(8, 2), role: "accessory", needs: { pullUpBar: true },
     primary: ["abs"], secondary: ["forearms", "obliques"],
     video: "p9hhX_Sx5v0", title: "The Hanging Knee Raise · Signum Fitness",
     cues: ["Shoulder-width grip, no swinging", "Curl the pelvis up, not just the knees", "Lower all the way each rep"] }),
];

const engine: Exercise[] = [
  ex("jumping-jack", "Jumping Jacks", "conditioning", { tier: 1, kind: timed(30, 5), role: "conditioning",
     primary: ["calves", "shoulders"], secondary: ["quads"],
     video: "nGaXj3kkmrU", title: "How to Do Jumping Jacks Properly · Babylon",
     cues: ["Land softly on the balls of the feet", "Arms fully overhead", "Steady rhythm"] }),
  ex("high-knees", "High Knees", "conditioning", { tier: 1, kind: timed(30, 5), role: "conditioning",
     primary: ["quads", "abs"], secondary: ["calves"],
     video: "QIwxSeKpHtI", title: "How to perform High Knees · Get Healthy U",
     cues: ["Knees to hip height", "Pump the arms", "Stay light and tall"] }),
  ex("mountain-climber", "Mountain Climber", "conditioning", { tier: 2, kind: timed(30, 5), role: "conditioning",
     primary: ["abs"], secondary: ["shoulders", "quads", "obliques"],
     video: "De3Gl-nC7IQ", title: "How to do Mountain Climbers the RIGHT way · Nick Tumminello",
     cues: ["Hands under shoulders, hips level", "Drive knees to chest one at a time", "Start controlled, then add speed"] }),
  ex("skater-jump", "Skater Hops", "conditioning", { tier: 2, kind: reps(10, 2), role: "conditioning", perSide: true,
     primary: ["glutes", "quads"], secondary: ["calves"],
     video: "gS4F_YrwZVs", title: "Lateral Skater Hops · J2FIT",
     cues: ["Bound sideways off one leg", "Land soft on the other, knee over toes", "Stick it, then go"] }),
  ex("farmer-carry", "Farmer Carry", "conditioning", { tier: 2, kind: timed(40, 10), role: "conditioning", needs: db2,
     primary: ["forearms", "traps"], secondary: ["abs", "obliques", "glutes"],
     video: "8OtwXwrJizk", title: "How To Do A Farmer's Walk · PureGym",
     cues: ["Heavy dumbbells at the sides", "Tall posture, shoulders down", "Short quick steps, walk laps"] }),
  ex("burpee", "Burpee", "conditioning", { tier: 3, kind: reps(8, 2), role: "conditioning",
     primary: ["quads", "chest"], secondary: ["shoulders", "abs", "glutes"],
     video: "wGvBfVeCNko", title: "Burpees for Beginners · Combat Fit",
     cues: ["Squat, hands down, jump back to plank", "Chest to floor, press up", "Jump feet in, then jump tall"] }),
  ex("db-thruster", "Dumbbell Thruster", "conditioning", { tier: 3, kind: reps(8, 2), role: "conditioning", needs: db2,
     primary: ["quads", "shoulders"], secondary: ["glutes", "triceps", "abs"],
     video: "tJP-fwf5ASA", title: "Dumbbell Thruster (Full Tutorial) · J2FIT",
     cues: ["Dumbbells at the shoulders, squat down", "Drive up and press overhead in one move", "Lower to the shoulders as you squat"] }),
  ex("jump-squat", "Jump Squat", "power", { tier: 2, kind: reps(8, 2), role: "power",
     primary: ["quads", "glutes"], secondary: ["calves"],
     video: "tZSYZdtbONc", title: "How to do a Squat Jump · NASM",
     cues: ["Quarter squat, swing the arms", "Jump as high as you can", "Land soft and reset each rep"] }),
  ex("db-swing", "Dumbbell Swing", "power", { tier: 2, kind: reps(15, 3), role: "power", needs: db1,
     primary: ["glutes", "hamstrings"], secondary: ["lowerBack", "abs", "shoulders"],
     video: "Y30kFfgW-bY", title: "How To: Dumbbell Swing · Live Lean TV",
     cues: ["Hold one end of the dumbbell with both hands", "Hinge, then snap the hips", "Arms just guide, chest height max"] }),
  ex("kb-swing", "Kettlebell Swing", "power", { tier: 2, kind: reps(15, 3), role: "power", needs: { kettlebells: 1 },
     primary: ["glutes", "hamstrings"], secondary: ["lowerBack", "abs", "shoulders"],
     video: "B_x0tp3HIbk", title: "How To Do a Proper Kettlebell Swing · Brandon Palmer",
     cues: ["Hinge, do not squat", "Snap the hips, arms just guide", "Stand tall, glutes locked at the top"] }),
];

const warmups: Exercise[] = [
  ex("jumping-jack-warmup", "Jumping Jacks", "warmup", { tier: 1, kind: timed(40, 0), role: "conditioning",
     primary: ["calves", "shoulders"],
     video: "nGaXj3kkmrU", title: "How to Do Jumping Jacks Properly · Babylon",
     cues: ["Easy pace to raise the heart rate"] }),
  ex("arm-circles", "Arm Circles", "warmup", { tier: 1, kind: timed(40, 0), role: "accessory",
     primary: ["shoulders"],
     video: "P3dzI9opLGE", title: "Arm Circles Dynamic Warmup · Made Possible PT",
     cues: ["Small circles growing bigger", "Switch direction halfway"] }),
  ex("cat-cow", "Cat-Cow", "warmup", { tier: 1, kind: timed(40, 0), role: "accessory",
     primary: ["lowerBack", "upperBack"],
     video: "KT6Fk7FWYfM", title: "How to Perform Cat Cow Stretch · Men's Health",
     cues: ["Round the spine up, then let it sag", "Move with the breath"] }),
  ex("worlds-greatest-stretch", "World's Greatest Stretch", "warmup", { tier: 1, kind: timed(40, 0), role: "accessory",
     primary: ["glutes", "hamstrings"], secondary: ["upperBack"],
     video: "-CiWQ2IvY34", title: "The World's Greatest Stretch · Squat University",
     cues: ["Lunge, elbow to the instep", "Rotate the arm to the ceiling", "Switch sides halfway"] }),
  ex("hip-circles", "Hip Circles", "warmup", { tier: 1, kind: timed(40, 0), role: "accessory",
     primary: ["glutes"], secondary: ["abs"],
     video: "Uq8QR1_N65U", title: "Standing Alternating Hip Circles · Live Lean TV",
     cues: ["Hold something for balance", "Big slow circles with the knee", "Switch legs halfway"] }),
  ex("inchworm", "Inchworm", "warmup", { tier: 1, kind: timed(40, 0), role: "accessory",
     primary: ["hamstrings", "shoulders"], secondary: ["abs"],
     video: "XFnK5X8hKB0", title: "How To: Inchworm Exercise · Live Lean TV",
     cues: ["Walk the hands out to a plank", "Walk the feet back in", "Keep the legs as straight as is comfortable"] }),
  ex("leg-swings", "Leg Swings", "warmup", { tier: 1, kind: timed(40, 0), role: "accessory",
     primary: ["hamstrings", "glutes"],
     video: "D17eUtUt0zQ", title: "Dynamic Warm-Up Leg Swings · MyPhysioRehab",
     cues: ["Hold a wall, swing front to back", "Then side to side", "Switch legs halfway"] }),
  ex("bodyweight-good-morning", "Good Morning", "warmup", { tier: 1, kind: timed(40, 0), role: "accessory",
     primary: ["hamstrings", "lowerBack"],
     video: "Kdeq15AvUVU", title: "Bodyweight Good Morning · PLT4M",
     cues: ["Hands behind the head", "Push the hips back, flat back", "Stand tall by squeezing the glutes"] }),
];

export const catalog: Exercise[] = [
  ...squat, ...hinge, ...lunge, ...push, ...overhead, ...pull, ...accessories, ...core, ...engine, ...warmups,
];

const byID = new Map(catalog.map((e) => [e.id, e]));

export function exerciseById(id: string): Exercise | undefined {
  return byID.get(id);
}

export function ladder(movement: Movement): Exercise[] {
  return catalog
    .filter((e) => e.movement === movement)
    .sort((a, b) => a.tier - b.tier || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
