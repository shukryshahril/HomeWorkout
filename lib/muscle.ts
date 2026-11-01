export const muscles = [
  "chest", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques",
  "traps", "upperBack", "lats", "lowerBack",
  "glutes", "quads", "hamstrings", "calves",
] as const;

export type Muscle = (typeof muscles)[number];

export function muscleName(muscle: Muscle): string {
  if (muscle === "upperBack") return "Upper back";
  if (muscle === "lowerBack") return "Lower back";
  return muscle.charAt(0).toUpperCase() + muscle.slice(1);
}

export const secondaryLoad = 1;
export const primaryLoad = 2;
export type MuscleLoad = typeof secondaryLoad | typeof primaryLoad;
export type MuscleMap = Partial<Record<Muscle, MuscleLoad>>;

// Primary wins over secondary when exercises overlap.
export function mergeMuscles(map: MuscleMap, primary: readonly Muscle[], secondary: readonly Muscle[]): MuscleMap {
  const next = { ...map };
  for (const m of secondary) if (next[m] === undefined) next[m] = secondaryLoad;
  for (const m of primary) next[m] = primaryLoad;
  return next;
}

export function primaryNames(map: MuscleMap): string[] {
  return (Object.keys(map) as Muscle[])
    .filter((m) => map[m] === primaryLoad)
    .sort()
    .map(muscleName);
}
