"use client";

import {
  CircleCheck, FastForward, Pause, Play, Rewind, SkipForward, SquarePen, Timer, Minus, Plus, BicepsFlexed, X,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { playCue } from "@/lib/cue";
import { type Exercise, exerciseMuscles, isLoaded } from "@/lib/exercise";
import { type DayPlan, type PlannedExercise, planMuscles, planRounds, prescriptionPerSet, sessionTitle } from "@/lib/program";
import { type LoadAdvice, clock, difficulties, kgText } from "@/lib/records";
import { type Step, WorkoutSession } from "@/lib/session";
import { BodyDiagram } from "./body-diagram";
import { Confetti } from "./confetti";
import { ExerciseVideo } from "./exercise-video";
import { GaugeIcon } from "./icons";
import { ChipButton, Confirm, Eyebrow, PrimaryButton, SecondaryButton, type Tint, VideoToggle, tintColor } from "./ui";

type Props = {
  plan: DayPlan;
  ownedWeights: number[];
  startingWeights: Record<string, number>;
  advice: Record<string, LoadAdvice>;
  showVideo: boolean;
  onVideo: (on: boolean) => void;
  onComplete: (session: WorkoutSession, rating: number | null) => Promise<void>;
  onClose: () => void;
};

// Dev-only shortcut for quick walkthroughs: localStorage.fastTimers = "1" runs timers at 10x.
const timeScale = () =>
  process.env.NODE_ENV !== "production" && typeof localStorage !== "undefined" && localStorage.getItem("fastTimers") === "1" ? 0.1 : 1;

// Keeps the screen on during a session (the web stand-in for isIdleTimerDisabled).
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      }, () => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, [active]);
}

export function WorkoutPlayer(props: Props) {
  const { plan, onClose } = props;
  const [session] = useState(() => new WorkoutSession(plan, { startingWeights: props.startingWeights, timeScale: timeScale(), onCue: playCue }));
  useSyncExternalStore(session.subscribe, () => session.version, () => 0);
  const [confirmExit, setConfirmExit] = useState(false);
  const resumeAfterDialog = useRef(false);

  useEffect(() => {
    session.start();
    return () => session.stop();
  }, [session]);
  useWakeLock(!session.isFinished);

  // Hold the clock while the exit dialog is up.
  function showExit(shown: boolean) {
    setConfirmExit(shown);
    if (shown) {
      resumeAfterDialog.current = !session.isPaused;
      if (resumeAfterDialog.current) session.togglePause();
    } else if (resumeAfterDialog.current && !session.isFinished) {
      resumeAfterDialog.current = false;
      session.togglePause();
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col">
        {session.isFinished ? (
          <Summary session={session} plan={plan} onComplete={props.onComplete} onClose={onClose} />
        ) : (
          <Player {...props} session={session} onExit={() => showExit(true)} />
        )}
      </div>
      <Confirm
        open={confirmExit}
        title="End this session?"
        actions={[
          {
            label: "End and log what I did",
            onClick: () => {
              setConfirmExit(false);
              session.endEarly();
              void props.onComplete(session, null).finally(onClose);
            },
          },
          {
            label: "Discard session",
            destructive: true,
            onClick: () => {
              setConfirmExit(false);
              session.stop();
              onClose();
            },
          },
        ]}
        cancelLabel="Keep going"
        onCancel={() => showExit(false)}
      />
    </div>
  );
}

function Player({ plan, session, ownedWeights, advice, showVideo, onVideo, onExit }: Props & { session: WorkoutSession; onExit: () => void }) {
  const step = session.step;
  const logging = session.editableEntryIndex !== null;
  const ringSize = showVideo ? 150 : logging ? 190 : 250;
  const phaseTint: Tint = step?.type === "work" ? "accent" : step?.type === "rest" ? "rest" : step?.type === "warmup" ? "good" : "ink";
  const currentItem = session.currentItem;
  const warmup = session.currentWarmup;

  const phaseLabel = !step ? "" : {
    warmup: `Warm-up ${step.type === "warmup" ? step.index + 1 : 0} of ${plan.warmup.length}`,
    prepare: "Get ready",
    work: plan.isCircuit ? "Circuit" : "Work",
    rest: plan.isCircuit ? "Transition" : "Rest",
  }[step.type];

  const title = warmup ? warmup.name : step && currentItem ? (step.type === "rest" ? "Breathe" : currentItem.exercise.name) : "";

  // Exercise whose video and cues fit the current moment: the warm-up move, the next exercise while resting, or the current one.
  const focusExercise: Exercise | null = warmup
    ?? (step?.type === "rest" ? (session.upNext?.exercise ?? currentItem?.exercise ?? null) : (currentItem?.exercise ?? null));

  const subtitle = (s: Step) => {
    if (session.isPaused) return "Paused";
    switch (s.type) {
      case "warmup": return "Easy pace";
      case "prepare": return "Starting soon";
      case "work": return plan.isCircuit ? `Round ${s.set}` : `Set ${s.set} of ${plan.items[s.item].prescription.sets}`;
      case "rest": return plan.isCircuit ? "Move to the next" : "Rest";
    }
  };

  const progressLabel = (() => {
    if (!step) return "";
    if (step.type === "warmup") return "Warm-up";
    const exercise = `Exercise ${step.item + 1} of ${plan.items.length}`;
    if (plan.isCircuit && step.type === "work") return `Round ${step.set} of ${planRounds(plan)} · ${exercise}`;
    return exercise;
  })();

  const weightLine = (item: PlannedExercise) => {
    if (!isLoaded(item.exercise)) return null;
    const kg = session.weight(plan.items.indexOf(item));
    const message = advice[item.exercise.id]?.message;
    if (kg !== null) return `${kgText(kg)} kg · ${message ?? "log it after the set"}`;
    return message ?? null;
  };

  const nextLine = (next: PlannedExercise) => {
    const set = plan.isCircuit ? `Round ${session.upNextSet ?? 1}` : `Set ${session.upNextSet ?? 1} of ${next.prescription.sets}`;
    return `${set} · ${prescriptionPerSet(next.prescription)}`;
  };

  const currentIndex = step && step.type !== "warmup" ? step.item : null;

  return (
    <>
      <div className="flex flex-col gap-3 px-5 pt-safe">
        <div className="flex items-center pt-2">
          <button
            type="button"
            onClick={onExit}
            aria-label="End session"
            className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink"
          >
            <X size={17} strokeWidth={2.75} />
          </button>
          <span className="mx-auto text-[14px] font-semibold text-muted">{progressLabel}</span>
          <span className="size-10" />
        </div>
        <div className="flex gap-1">
          {plan.items.map((item, i) => (
            <span
              key={item.exercise.id}
              className="h-1 flex-1 rounded-full"
              style={{
                background: step?.type === "warmup" ? "var(--line)"
                  : i < (currentIndex ?? plan.items.length) && !plan.isCircuit ? "var(--ink)"
                    : i === currentIndex ? tintColor(phaseTint) : "var(--line)",
              }}
            />
          ))}
        </div>
      </div>

      {step && (
        <div className="my-auto flex flex-col items-center gap-3.5 px-5 py-4">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Eyebrow text={phaseLabel} tint={phaseTint} />
            <h1 className="font-display line-clamp-2 text-[38px] text-ink">{title}</h1>
          </div>
          <TimerRing progress={session.progress} tint={phaseTint} size={ringSize}>
            <span className={`font-display tabular text-ink ${ringSize > 200 ? "text-[80px]" : "text-[54px]"}`}>
              {clock(session.remainingSeconds)}
            </span>
            <span className="text-[15px] font-semibold text-muted">{subtitle(step)}</span>
          </TimerRing>
          {session.editableEntryIndex !== null && (
            <SetLogCard session={session} entryIndex={session.editableEntryIndex} ownedWeights={ownedWeights} />
          )}
          {showVideo && focusExercise ? (
            <ExerciseVideo exercise={focusExercise} />
          ) : step.type === "warmup" ? (
            warmup && <InfoCard exercise={warmup} headline={warmup.cues[0] ?? ""} lines={warmup.cues.slice(1)} />
          ) : step.type === "rest" ? (
            session.upNext && (
              <InfoCard
                exercise={session.upNext.exercise}
                eyebrow={session.upNext === currentItem ? "Next set" : "Up next"}
                headline={session.upNext.exercise.name}
                lines={[nextLine(session.upNext)]}
                compact={logging}
              />
            )
          ) : (
            currentItem && (
              <InfoCard
                exercise={currentItem.exercise}
                headline={prescriptionPerSet(currentItem.prescription)}
                lines={[
                  weightLine(currentItem),
                  currentItem.prescription.tempo && `Tempo ${currentItem.prescription.tempo} · down-pause-up`,
                  currentItem.exercise.cues[0],
                ].filter((l): l is string => !!l)}
              />
            )
          )}
        </div>
      )}

      <div className="flex flex-col gap-3.5 px-5 pb-safe">
        <div className="flex justify-center gap-2.5">
          <VideoToggle on={showVideo} onChange={onVideo} />
          {step?.type === "warmup" ? (
            <ChipButton title="Skip warm-up" icon={<SkipForward size={16} />} onClick={() => session.skipWarmup()} />
          ) : (
            <ChipButton title="Skip exercise" icon={<SkipForward size={16} />} onClick={() => session.skipExercise()} />
          )}
        </div>
        <div className="flex items-center justify-center gap-7">
          <RoundButton label="Back to previous set" disabled={!session.canGoBack} onClick={() => session.back()}>
            <Rewind size={20} className="fill-current" />
          </RoundButton>
          <button
            type="button"
            onClick={() => session.togglePause()}
            aria-label={session.isPaused ? "Resume" : "Pause"}
            className="flex size-20 items-center justify-center rounded-full bg-ink text-on-ink"
          >
            {session.isPaused ? <Play size={30} className="ml-1 fill-current" /> : <Pause size={30} className="fill-current" />}
          </button>
          <RoundButton label="Skip" onClick={() => session.skip()}>
            <FastForward size={20} className="fill-current" />
          </RoundButton>
        </div>
        {step?.type === "work" ? (
          <PrimaryButton onClick={() => session.completeStep()}>Set done</PrimaryButton>
        ) : step?.type === "rest" ? (
          <div className="flex gap-2.5">
            <SecondaryButton onClick={() => session.addRest(15)}>+15s</SecondaryButton>
            <PrimaryButton tint="rest" onClick={() => session.completeStep()}>Skip rest</PrimaryButton>
          </div>
        ) : step?.type === "warmup" ? (
          <PrimaryButton tint="good" onClick={() => session.completeStep()}>Next move</PrimaryButton>
        ) : (
          <PrimaryButton tint="ink" onClick={() => session.completeStep()}>Start now</PrimaryButton>
        )}
      </div>
    </>
  );
}

function RoundButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-[54px] items-center justify-center rounded-full border border-line bg-surface text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function TimerRing({ progress, tint, size, children }: { progress: number; tint: Tint; size: number; children: React.ReactNode }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative flex shrink-0 items-center justify-center transition-[width,height]" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tintColor(tint)}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0.001, Math.min(1, progress)))}
          className="transition-[stroke-dashoffset] duration-100 ease-linear"
        />
      </svg>
      <div className="relative flex flex-col items-center gap-0.5">{children}</div>
    </div>
  );
}

function InfoCard({ exercise, eyebrow, headline, lines, compact = false }: {
  exercise: Exercise; eyebrow?: string; headline: string; lines: string[]; compact?: boolean;
}) {
  return (
    <div className={`flex w-full items-center gap-3.5 rounded-[14px] border border-line bg-surface ${compact ? "p-3" : "p-3.5"}`}>
      {!compact && <BodyDiagram muscles={exerciseMuscles(exercise)} showLabels={false} className="w-[60px] shrink-0" />}
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <Eyebrow text={eyebrow} />}
        <span className={`font-title line-clamp-2 text-ink ${compact ? "text-[19px]" : "text-[22px]"}`}>{headline}</span>
        {lines.map((line) => (
          <span key={line} className="line-clamp-2 text-[13px] text-muted">{line}</span>
        ))}
      </div>
    </div>
  );
}

// Logs what was actually done on the set just finished; defaults are the target and current weight.
function SetLogCard({ session, entryIndex, ownedWeights }: { session: WorkoutSession; entryIndex: number; ownedWeights: number[] }) {
  const entry = session.entries.get(entryIndex);
  if (!entry) return null;
  const exercise = session.plan.items[entry.item].exercise;
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-3">
      <span className="flex items-center gap-1.5">
        <SquarePen size={15} className="shrink-0 text-accent" />
        <Eyebrow text={`Log ${exercise.name} · set ${entry.set}`} className="truncate" />
      </span>
      <div className="flex items-center gap-2.5">
        <Stepper
          value={entry.seconds !== null ? `${entry.seconds}s` : String(entry.reps ?? 0)}
          unit={entry.seconds === null ? "reps" : "held"}
          onChange={(delta) => session.adjustReps(entryIndex, delta)}
        />
        {isLoaded(exercise) && (ownedWeights.length === 0 ? (
          <Stepper
            value={entry.weightKg !== null ? kgText(entry.weightKg) : "–"}
            unit="kg"
            onChange={(delta) => {
              const next = Math.max(0, (entry.weightKg ?? 0) + delta * 2.5);
              session.setWeight(next === 0 ? null : next, entryIndex);
            }}
          />
        ) : (
          <div className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
            {ownedWeights.map((kg) => {
              const on = entry.weightKg === kg;
              return (
                <button
                  key={kg}
                  type="button"
                  aria-pressed={on}
                  onClick={() => session.setWeight(kg, entryIndex)}
                  className={`shrink-0 rounded-full px-3 py-[9px] text-[14px] font-semibold ${on ? "bg-ink text-on-ink" : "bg-canvas text-ink"}`}
                >
                  {kgText(kg)} kg
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stepper({ value, unit, onChange }: { value: string; unit: string; onChange: (delta: number) => void }) {
  const step = (delta: number, label: string, glyph: React.ReactNode) => (
    <button
      type="button"
      aria-label={`${label} ${unit}`}
      onClick={() => onChange(delta)}
      className="flex size-[34px] items-center justify-center rounded-full bg-canvas text-ink"
    >
      {glyph}
    </button>
  );
  return (
    <div className="flex shrink-0 items-center gap-1">
      {step(-1, "Less", <Minus size={14} strokeWidth={3} />)}
      <span className="flex min-w-11 flex-col items-center">
        <span className="font-display tabular text-[24px] font-bold text-ink">{value}</span>
        <span className="text-[10px] font-semibold text-muted">{unit}</span>
      </span>
      {step(1, "More", <Plus size={14} strokeWidth={3} />)}
    </div>
  );
}

function Summary({ session, plan, onComplete, onClose }: {
  session: WorkoutSession; plan: DayPlan; onComplete: Props["onComplete"]; onClose: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const selected = difficulties.find((d) => d.value === rating);
  return (
    <>
      <div className="flex flex-col gap-5 p-5 pt-safe">
        <div className="flex flex-col gap-5 pt-6">
          <Eyebrow text={`Day ${plan.day} · ${sessionTitle[plan.type]}`} tint="accent" />
          <h1 className="font-display text-[56px] text-ink">Session<br />{session.setsDone === 0 ? "logged." : "finished."}</h1>
        </div>
        <div className="flex rounded-[14px] border border-line bg-surface py-4">
          <Stat value={String(session.setsDone)} label="Sets done" icon={<CircleCheck size={18} className="fill-good text-surface" />} />
          <Stat value={String(session.setsSkipped)} label="Skipped" icon={<FastForward size={18} className="fill-muted text-muted" />} />
          <Stat value={clock(Math.floor(session.elapsed))} label="Time" icon={<Timer size={18} className="text-accent" />} />
        </div>
        <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-[18px]">
          <span className="flex items-center gap-1.5">
            <BicepsFlexed size={16} className="text-accent" />
            <Eyebrow text="Worked today" />
          </span>
          <BodyDiagram muscles={planMuscles(plan)} className="mx-auto w-full max-w-[200px]" />
        </div>
      </div>
      {/* Rating and confirm stay pinned in the thumb zone. */}
      <div className="sticky bottom-0 mt-auto flex flex-col gap-3.5 bg-canvas px-5 pb-safe pt-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-2.5">
          <span className="flex items-center gap-1.5">
            <GaugeIcon fraction={0.5} size={17} />
            <Eyebrow text="How hard was today?" />
          </span>
          <div className="flex gap-1.5">
            {difficulties.map((d, i) => {
              const on = rating === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRating(on ? null : d.value)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-[10px] border py-2.5 ${on ? "border-transparent bg-ink text-on-ink" : "border-line bg-surface text-ink"}`}
                >
                  <GaugeIcon fraction={i / 4} size={26} />
                  <span className="truncate text-[11px] font-semibold">{d.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[13px]" style={{ color: rating === 5 ? "var(--rest)" : "var(--muted)" }}>
            {selected?.note ?? "Optional. Your rating tunes the next session."}
          </p>
        </div>
        <PrimaryButton
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onComplete(session, rating);
              onClose();
            } catch {
              setSaving(false);
            }
          }}
        >
          Mark day {plan.day} complete
        </PrimaryButton>
      </div>
      {session.setsDone > 0 && <Confetti />}
    </>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="flex h-[22px] items-center">{icon}</span>
      <span className="font-display tabular text-[30px] font-bold text-ink">{value}</span>
      <Eyebrow text={label} />
    </div>
  );
}
