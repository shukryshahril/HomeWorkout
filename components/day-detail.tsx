"use client";

import { ArrowUpRight, ChevronDown, ChevronLeft, Circle, Equal, Flame, Play, RefreshCw, Weight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { unlockAudio } from "@/lib/cue";
import { type Exercise, exerciseMuscles, isLoaded } from "@/lib/exercise";
import { bodyweight, isBodyweightOnly, needsLabel } from "@/lib/gear";
import {
  type DayPlan, type PlannedExercise, adjustmentExplanation, circuitRoundRest, circuitTransition, estimatedMinutes,
  isRestDay, phaseInfo, phaseWeekLabel, planDay, planMuscles, planRounds, prescriptionLine, sessionTitle, warmupMinutes,
} from "@/lib/program";
import {
  type LoadAdvice, type Profile, inBlock, lastSession, loadAdvice, ownedWeights, profileContext, profileGear, sessionAdjustment,
} from "@/lib/records";
import type { WorkoutSession } from "@/lib/session";
import { BodyDiagram, MuscleLegend } from "./body-diagram";
import { ExerciseDetail } from "./exercise-detail";
import { ExerciseVideo } from "./exercise-video";
import { useStore } from "./store";
import { Card, CircleIconButton, Eyebrow, Pill, PrimaryButton, Segmented, Sheet, VideoToggle } from "./ui";
import { WorkoutPlayer } from "./workout-player";

export function DayDetail({ day, profile }: { day: number; profile: Profile }) {
  const { state, recordSession, clearDay, saveSettings } = useStore();
  const router = useRouter();
  const [bodyweightToday, setBodyweightToday] = useState(false);
  const [running, setRunning] = useState<DayPlan | null>(null);
  const [expandedID, setExpandedID] = useState<string | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);

  const gear = profileGear(profile);
  const logs = inBlock(state?.logs ?? [], profile.block);
  const sets = state?.sets ?? [];
  const weights = ownedWeights(profile);
  const showVideo = state?.settings.showFormVideo ?? false;
  const plan = planDay(day, { ...profileContext(profile), gear: bodyweightToday ? bodyweight : gear }, sessionAdjustment(logs, day));
  const log = logs.find((l) => l.day === day);

  const advice: Record<string, LoadAdvice> = {};
  for (const item of plan.items) {
    const a = loadAdvice(sets, item.exercise, weights);
    if (a) advice[item.exercise.id] = a;
  }
  // Start each loaded exercise at the suggested weight, else the last weight used.
  const startingWeights: Record<string, number> = {};
  for (const item of plan.items) {
    if (!isLoaded(item.exercise)) continue;
    const used = lastSession(sets, item.exercise.id).map((s) => s.weightKg).filter((kg): kg is number => kg !== null);
    const kg = advice[item.exercise.id]?.suggestedKg ?? (used.length > 0 ? Math.max(...used) : null);
    if (kg !== null) startingWeights[item.exercise.id] = kg;
  }

  async function record(setsDone: number, setsSkipped: number, seconds: number, rating: number | null, session?: WorkoutSession) {
    const entries = session ? [...session.entries.values()] : [];
    await recordSession({
      block: profile.block, day, durationSeconds: seconds, setsDone, setsSkipped, bodyweightOnly: bodyweightToday, rating,
      // A rerun of the day replaces that day's earlier set logs.
      sets: entries.length === 0 ? undefined : entries.map((entry) => {
        const item = plan.items[entry.item];
        return {
          exerciseID: item.exercise.id, setNumber: entry.set, reps: entry.reps, seconds: entry.seconds, weightKg: entry.weightKg,
          targetReps: item.prescription.reps, targetSeconds: item.prescription.seconds,
        };
      }),
    });
  }

  const explanation = isRestDay(plan)
    ? "No training today. Easy movement and sleep are where the gains land."
    : adjustmentExplanation[plan.adjustment]
      ?? (plan.isReentry ? "Re-entry week: bodyweight versions only and one set less, so your joints catch up before load." : phaseInfo[plan.phase].summary);
  const explanationColor = plan.adjustment === "none" ? "var(--muted)" : plan.adjustment === "push" ? "var(--good)" : "var(--rest)";

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-col gap-[22px] p-5 pt-safe">
        <header className="flex flex-col gap-2 pt-1">
          <div className="no-scrollbar -ml-1 flex items-center gap-2 overflow-x-auto">
            <CircleIconButton icon={<ChevronLeft size={18} strokeWidth={2.5} />} label="Back" href="/" />
            <Pill text={`Day ${day}`} filled tall />
            <Pill text={`${phaseWeekLabel(plan.phase)} · ${phaseInfo[plan.phase].name}`} tint={plan.phase === "deload" ? "rest" : "ink"} tall />
            {log && <Pill text="Done" tint="good" filled tall />}
          </div>
          <h1 className="font-display text-[48px] text-ink">{sessionTitle[plan.type]}</h1>
          <p className="text-[15px]" style={{ color: explanationColor }}>{explanation}</p>
        </header>

        {isRestDay(plan) ? (
          <Card className="flex flex-col gap-2.5">
            <Eyebrow text="Recovery" tint="rest" />
            {["20–30 min easy walk", "5 min hip and hamstring stretching", "Sleep 7+ hours"].map((item) => (
              <span key={item} className="flex items-center gap-2.5 text-[15px] text-ink">
                <Circle size={16} className="text-muted" />
                {item}
              </span>
            ))}
          </Card>
        ) : (
          <>
            {!isBodyweightOnly(gear) && (
              <Segmented
                options={[{ value: false, label: "My equipment" }, { value: true, label: "No gear today" }]}
                value={bodyweightToday}
                onChange={setBodyweightToday}
              />
            )}
            {plan.isCircuit && (
              <p className="flex items-start gap-2 text-[14px] font-medium text-ink">
                <RefreshCw size={16} className="mt-0.5 shrink-0" />
                Circuit · {planRounds(plan)} rounds. One set of each, {circuitTransition}s to switch, {circuitRoundRest}s between rounds.
              </p>
            )}
            <Card className="flex flex-col gap-3.5">
              <BodyDiagram muscles={planMuscles(plan)} className="mx-auto w-full max-w-[260px]" />
              <MuscleLegend />
            </Card>
            <section className="flex flex-col gap-2.5">
              <span className="flex items-center gap-1.5">
                <Flame size={15} className="text-good" />
                <Eyebrow text={`Warm-up · ${warmupMinutes(plan)} min`} />
              </span>
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
                {plan.warmup.map((move) => (
                  <button
                    key={move.id}
                    type="button"
                    onClick={() => setDetail(move)}
                    className="shrink-0 rounded-full border border-line bg-surface px-3 py-2 text-[14px] font-medium text-ink"
                  >
                    {move.name}
                  </button>
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-2.5">
              <Eyebrow text={`${plan.items.length} exercises · ~${estimatedMinutes(plan)} min`} />
              <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
                {plan.items.map((item, index) => {
                  const expanded = expandedID === item.exercise.id;
                  return (
                    <div key={item.exercise.id} className={index > 0 ? "border-t border-line" : ""}>
                      <ExerciseRow
                        index={index + 1}
                        item={item}
                        advice={advice[item.exercise.id]}
                        expanded={expanded}
                        onToggle={() => setExpandedID(expanded ? null : item.exercise.id)}
                      />
                      {expanded && (
                        <ExpandedExercise
                          item={item}
                          showVideo={showVideo}
                          onVideo={(showFormVideo) => saveSettings({ showFormVideo })}
                          onDetails={() => setDetail(item.exercise)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 border-t border-line/60 bg-canvas/80 px-5 pb-safe pt-3 backdrop-blur-xl">
        {isRestDay(plan) ? (
          <PrimaryButton
            tint={log ? "muted" : "rest"}
            disabled={!!log}
            onClick={async () => {
              await record(0, 0, 0, null);
              router.push("/");
            }}
          >
            {log ? "Rest day logged" : "Mark rest day done"}
          </PrimaryButton>
        ) : (
          <PrimaryButton
            onClick={() => {
              unlockAudio();
              setRunning(plan);
            }}
          >
            <Play size={17} className="fill-current" />
            {log ? "Run it again" : "Start session"}
          </PrimaryButton>
        )}
        {log && (
          <button type="button" onClick={() => clearDay(profile.block, day)} className="py-1.5 text-[14px] font-medium text-[#e5484d]">
            Clear day {day} log
          </button>
        )}
      </div>

      <Sheet open={detail !== null} onClose={() => setDetail(null)}>
        {detail && <ExerciseDetail exercise={detail} prescription={plan.items.find((i) => i.exercise.id === detail.id)?.prescription} />}
      </Sheet>

      {running && (
        <WorkoutPlayer
          plan={running}
          ownedWeights={weights}
          startingWeights={startingWeights}
          advice={advice}
          showVideo={showVideo}
          onVideo={(showFormVideo) => saveSettings({ showFormVideo })}
          onComplete={(session, rating) => record(session.setsDone, session.setsSkipped, Math.floor(session.elapsed), rating, session)}
          onClose={() => setRunning(null)}
        />
      )}
    </div>
  );
}

function ExerciseRow({ index, item, advice, expanded, onToggle }: {
  index: number; item: PlannedExercise; advice?: LoadAdvice; expanded: boolean; onToggle: () => void;
}) {
  const p = item.prescription;
  const label = needsLabel(item.exercise.needs);
  const AdviceIcon = advice?.kind === "progress" ? ArrowUpRight : advice?.kind === "hold" ? Equal : Weight;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${item.exercise.name}. ${expanded ? "Hides" : "Shows"} the form video`}
      className="flex w-full items-center gap-3.5 p-3.5 text-left"
    >
      <span className="font-display w-6 shrink-0 text-[20px] font-bold text-muted">{index}</span>
      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="text-[16px] font-semibold text-ink">{item.exercise.name}</span>
        <span className="text-[13px] text-muted">
          <span className="tabular">{prescriptionLine(p)}</span>
          {p.tempo && ` · tempo ${p.tempo}`} · rest {p.restSeconds}s
        </span>
        <span className="text-[12px] font-medium text-accent">{p.effort}</span>
        {advice && (
          <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: advice.kind === "progress" ? "var(--good)" : "var(--muted)" }}>
            <AdviceIcon size={13} strokeWidth={2.75} className="shrink-0" />
            {advice.message}
          </span>
        )}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {label && <span className="text-[11px] font-semibold text-muted">{label}</span>}
        <ChevronDown
          size={15}
          strokeWidth={2.5}
          className="transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : undefined, color: expanded ? "var(--ink)" : "var(--muted)" }}
        />
      </span>
    </button>
  );
}

function ExpandedExercise({ item, showVideo, onVideo, onDetails }: {
  item: PlannedExercise; showVideo: boolean; onVideo: (on: boolean) => void; onDetails: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-3.5 pb-3.5">
      <div><VideoToggle on={showVideo} onChange={onVideo} /></div>
      {showVideo && <ExerciseVideo exercise={item.exercise} />}
      <div className="flex items-start gap-3.5">
        <BodyDiagram muscles={exerciseMuscles(item.exercise)} showLabels={false} className="w-[92px] shrink-0" />
        <div className="flex flex-col gap-2">
          {item.exercise.cues.map((cue, i) => (
            <div key={cue} className="flex items-baseline gap-2">
              <span className="font-display text-[15px] font-bold text-accent">{i + 1}</span>
              <span className="text-[14px] text-ink">{cue}</span>
            </div>
          ))}
          <button type="button" onClick={onDetails} className="self-start text-[13px] font-semibold text-accent">Muscles and details</button>
        </div>
      </div>
    </div>
  );
}
