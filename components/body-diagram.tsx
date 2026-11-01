import bodyMap from "@/lib/data/body-map.json";
import { type Muscle, type MuscleMap, primaryLoad, primaryNames } from "@/lib/muscle";
import { Eyebrow } from "./ui";

// Anatomy paths come from react-native-body-highlighter (MIT); see BODYMAP-LICENSE.txt.
const slugMuscles: Record<string, Muscle[]> = {
  chest: ["chest"], abs: ["abs"], obliques: ["obliques"],
  biceps: ["biceps"], triceps: ["triceps"], forearm: ["forearms"],
  deltoids: ["shoulders"], trapezius: ["traps"],
  "upper-back": ["upperBack", "lats"], "lower-back": ["lowerBack"],
  gluteal: ["glutes"], quadriceps: ["quads"], adductors: ["quads"],
  hamstring: ["hamstrings"], calves: ["calves"], tibialis: ["calves"],
};

// Bounds of outline plus regions (padded by 4), widened to a shared frame so both figures scale and align
// identically. Computed once from body-map.json.
const viewBox = { front: "45 92.5 638.5 1263", back: "764.6 92.5 638.5 1263" };

type Side = "front" | "back";

function regionFill(slug: string, muscles: MuscleMap): string {
  const mapped = slugMuscles[slug] ?? [];
  const loads = mapped.map((m) => muscles[m] ?? 0);
  const load = Math.max(0, ...loads);
  if (load === primaryLoad) return "var(--accent)";
  if (load > 0) return "var(--accent-soft)";
  return mapped.length === 0 ? "var(--body-base)" : "var(--muscle-idle)";
}

function Figure({ side, muscles }: { side: Side; muscles: MuscleMap }) {
  const data = bodyMap[side];
  return (
    <svg viewBox={viewBox[side]} className="block h-auto w-full" aria-hidden>
      <path d={data.outline} fill="var(--body-base)" />
      {data.regions.map((region, i) => (
        <path key={`${region.slug}-${i}`} d={region.paths.join(" ")} fill={regionFill(region.slug, muscles)} />
      ))}
    </svg>
  );
}

export function BodyDiagram({ muscles, showLabels = true, className }: { muscles: MuscleMap; showLabels?: boolean; className?: string }) {
  return (
    <div className={`flex items-start gap-2 ${className ?? ""}`} role="img" aria-label={`Muscles worked: ${primaryNames(muscles).join(", ")}`}>
      {(["front", "back"] as const).map((side) => (
        <div key={side} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <Figure side={side} muscles={muscles} />
          {showLabels && <Eyebrow text={side === "front" ? "Front" : "Back"} />}
        </div>
      ))}
    </div>
  );
}

export function MuscleLegend() {
  return (
    <div className="flex items-center justify-center gap-3.5 text-[12px] font-medium text-muted">
      <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[2px] bg-accent" />Primary</span>
      <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[2px] bg-accent-soft" />Secondary</span>
    </div>
  );
}
