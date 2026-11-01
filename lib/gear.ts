export type Gear = {
  dumbbells: number;
  kettlebells: number;
  bench: boolean;
  pullUpBar: boolean;
  band: boolean;
};

export const bodyweight: Gear = { dumbbells: 0, kettlebells: 0, bench: false, pullUpBar: false, band: false };

export function isBodyweightOnly(gear: Gear): boolean {
  return gear.dumbbells === 0 && gear.kettlebells === 0 && !gear.bench && !gear.pullUpBar && !gear.band;
}

export function gearSummary(gear: Gear): string {
  const parts: string[] = [];
  if (gear.dumbbells > 0) parts.push(gear.dumbbells === 1 ? "1 dumbbell" : `${gear.dumbbells} dumbbells`);
  if (gear.kettlebells > 0) parts.push(gear.kettlebells === 1 ? "1 kettlebell" : `${gear.kettlebells} kettlebells`);
  if (gear.bench) parts.push("bench");
  if (gear.pullUpBar) parts.push("pull-up bar");
  if (gear.band) parts.push("band");
  return parts.length === 0 ? "Bodyweight only" : parts.join(" · ");
}

export type GearNeeds = Partial<Gear>;

export function needsMet(needs: GearNeeds, gear: Gear): boolean {
  return (
    gear.dumbbells >= (needs.dumbbells ?? 0) &&
    gear.kettlebells >= (needs.kettlebells ?? 0) &&
    (!needs.bench || gear.bench) &&
    (!needs.pullUpBar || gear.pullUpBar) &&
    (!needs.band || gear.band)
  );
}

export function needsLoaded(needs: GearNeeds): boolean {
  return (needs.dumbbells ?? 0) > 0 || (needs.kettlebells ?? 0) > 0;
}

export function needsLabel(needs: GearNeeds): string | null {
  const parts: string[] = [];
  const db = needs.dumbbells ?? 0;
  if (db > 0) parts.push(db === 1 ? "1 DB" : `${db} DB`);
  if ((needs.kettlebells ?? 0) > 0) parts.push("KB");
  if (needs.bench) parts.push("Bench");
  if (needs.pullUpBar) parts.push("Bar");
  if (needs.band) parts.push("Band");
  return parts.length === 0 ? null : parts.join(" + ");
}
