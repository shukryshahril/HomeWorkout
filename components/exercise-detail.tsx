import { type Exercise, exerciseMuscles } from "@/lib/exercise";
import { needsLabel } from "@/lib/gear";
import { muscleName } from "@/lib/muscle";
import { type Prescription, prescriptionTarget } from "@/lib/program";
import { BodyDiagram } from "./body-diagram";
import { ExerciseVideo } from "./exercise-video";
import { Card, Eyebrow } from "./ui";

export function ExerciseDetail({ exercise, prescription }: { exercise: Exercise; prescription?: Prescription }) {
  const stats = prescription && [
    ["Sets", String(prescription.sets)],
    [prescription.seconds === null ? "Reps" : "Hold", prescriptionTarget(prescription)],
    ["Tempo", prescription.tempo ?? "Steady"],
    ["Rest", `${prescription.restSeconds}s`],
  ];
  return (
    <div className="flex flex-col gap-5 pb-5">
      <div className="flex flex-col gap-1.5">
        <Eyebrow text={needsLabel(exercise.needs) ?? "Bodyweight"} />
        <h2 className="font-display text-[42px] text-ink">{exercise.name}</h2>
      </div>
      <ExerciseVideo exercise={exercise} />
      {stats && (
        <div className="flex rounded-[14px] border border-line bg-surface py-3.5">
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-display truncate text-[24px] font-bold text-ink">{value}</span>
              <Eyebrow text={label} />
            </div>
          ))}
        </div>
      )}
      <Card className="flex flex-col gap-3">
        <Eyebrow text="Form cues" />
        {exercise.cues.map((cue, i) => (
          <div key={cue} className="flex items-baseline gap-2.5">
            <span className="font-display text-[18px] font-bold text-accent">{i + 1}</span>
            <span className="text-[15px] text-ink">{cue}</span>
          </div>
        ))}
      </Card>
      <Card className="flex flex-col gap-3.5">
        <Eyebrow text="Muscles worked" />
        <BodyDiagram muscles={exerciseMuscles(exercise)} className="mx-auto w-full max-w-[240px]" />
        <p className="text-[15px]">
          <span className="font-semibold text-ink">{exercise.primary.map(muscleName).join(", ")}</span>
          {exercise.secondary.length > 0 && (
            <span className="text-muted">{"  with " + exercise.secondary.map(muscleName).join(", ").toLowerCase()}</span>
          )}
        </p>
      </Card>
    </div>
  );
}
