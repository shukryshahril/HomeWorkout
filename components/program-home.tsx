"use client";

import { ArrowRight, ChartLine, ChevronRight, CircleArrowRight, CircleCheck, Settings as SettingsIcon, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ladderMovements, movementName } from "@/lib/exercise";
import { muscleName } from "@/lib/muscle";
import {
  type DayPlan, type Phase, adjustmentBadge, buildProgram, contextBlockInYear, contextYear, estimatedMinutes, isRestDay,
  macroForBlock, macroInfo, minLevel, phaseForDay, phaseInfo, phaseWeekLabel, phases, planDay, planFocus, planMuscles,
  prescriptionLine, programLength, routeInfo, sessionTitle,
} from "@/lib/program";
import {
  type Profile, applyGrowth, completedDays, inBlock, ladderGrowth, nextBlockLevel, nextDay, profileContext, sessionAdjustment,
} from "@/lib/records";
import { BodyDiagram } from "./body-diagram";
import { macroIcon } from "./icon-maps";
import { useStore } from "./store";
import { Card, CircleIconButton, Eyebrow, Pill, PrimaryButton } from "./ui";

export function greeting(name: string, date: Date): string {
  const hour = date.getHours();
  const part = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : hour >= 17 ? "Good evening" : "Still up";
  const trimmed = name.trim();
  return trimmed ? `${part}, ${trimmed}` : part;
}

// Re-renders once a minute so the greeting follows the clock; null while server rendering.
const subscribeMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, 15_000);
  return () => clearInterval(timer);
};

function useMinute(): Date | null {
  const minute = useSyncExternalStore(subscribeMinute, () => Math.floor(Date.now() / 60_000), () => null);
  return minute === null ? null : new Date(minute * 60_000);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function ProgramHome({ profile }: { profile: Profile }) {
  const { state, saveProfile } = useStore();
  const router = useRouter();
  const now = useMinute();
  const context = profileContext(profile);
  const logs = inBlock(state?.logs ?? [], profile.block);
  const sets = state?.sets ?? [];
  const program = buildProgram(context);
  const done = completedDays(logs);
  const today = nextDay(logs);
  const isComplete = done.size >= programLength;
  const macro = macroForBlock(profile.block);
  const MacroIcon = macroIcon[macro];

  const phaseSummary = (phase: Phase) => {
    if (profile.level > minLevel || profile.block !== 1) return phaseInfo[phase].summary;
    if (phase === "foundation") return "Re-entry week: bodyweight only, 2 sets, low reps. Weights start next week.";
    if (phase === "build") return "Equipment comes in with light loads. Still one set less than standard.";
    return phaseInfo[phase].summary;
  };

  const open = (day: number) => router.push(`/day/${day}`);

  return (
    <div className="flex flex-col gap-[22px] p-5 pt-safe">
      <header className="flex flex-col gap-2 pt-2">
        <div className="flex items-center">
          <h1 className="font-title truncate text-[24px] text-ink">{now ? greeting(state?.settings.userName ?? "", now) : " "}</h1>
          <span className="ml-auto flex">
            <CircleIconButton icon={<ChartLine size={16} strokeWidth={2.5} />} label="Progress" href="/progress" />
            <CircleIconButton icon={<SettingsIcon size={16} strokeWidth={2.5} />} label="Settings" href="/settings" />
          </span>
        </div>
        <Link href="/roadmap" className="flex items-center gap-1.5 pt-1.5" aria-label="Open your year roadmap">
          <MacroIcon size={16} className="shrink-0 text-accent" />
          <Eyebrow
            text={`Year ${contextYear(context)} · Block ${contextBlockInYear(context)} · ${macroInfo[macro].name} · ${routeInfo[profile.route].name}`}
          />
          <ChevronRight size={13} strokeWidth={3} className="text-muted" />
        </Link>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display tabular text-[64px] text-ink">Day {pad(today)}</span>
          <span className="font-display text-[28px] font-bold text-muted">/ 30</span>
        </div>
        <div className="flex items-center gap-2">
          <Pill text={phaseWeekLabel(phaseForDay(today))} filled />
          <Pill text={phaseInfo[phaseForDay(today)].name} />
          <span className="ml-auto text-[13px] font-medium text-muted">{done.size} done</span>
        </div>
      </header>

      <StreakStrip program={program} done={done} today={today} open={open} />

      {isComplete ? (
        <CompleteCard
          profile={profile}
          nextLevel={nextBlockLevel(logs, profile.level)}
          growth={ladderGrowth(sets, profile.block)}
          onStart={(level, growth) =>
            saveProfile({ movementOffsets: applyGrowth(profile.movementOffsets, growth), level, block: profile.block + 1 })
          }
        />
      ) : (
        <TodayCard plan={planDay(today, context, sessionAdjustment(logs, today))} href={`/day/${today}`} />
      )}

      {phases.map((phase) => (
        <PhaseSection
          key={phase}
          phase={phase}
          summary={phaseSummary(phase)}
          days={program.filter((p) => p.phase === phase)}
          done={done}
          today={today}
        />
      ))}
    </div>
  );
}

function StreakStrip({ program, done, today, open }: { program: DayPlan[]; done: Set<number>; today: number; open: (day: number) => void }) {
  const color = (plan: DayPlan) => {
    if (done.has(plan.day)) return isRestDay(plan) ? "var(--rest)" : "var(--ink)";
    if (plan.day === today) return "var(--accent)";
    return "var(--line)";
  };
  return (
    <div className="flex h-[22px] items-end gap-[3px]" role="img" aria-label={`${done.size} of 30 days complete`}>
      {program.map((plan) => (
        <button
          key={plan.day}
          type="button"
          tabIndex={-1}
          onClick={() => open(plan.day)}
          className="flex-1 rounded-[2px] transition-[height]"
          style={{ height: plan.day === today ? 22 : 14, background: color(plan) }}
        />
      ))}
    </div>
  );
}

function TodayCard({ plan, href }: { plan: DayPlan; href: string }) {
  const badge = adjustmentBadge[plan.adjustment];
  return (
    <Link href={href} className="block">
      <Card className="flex flex-col gap-3.5">
        <div className="flex items-start">
          <div className="flex flex-col gap-1">
            <Eyebrow text="Up next" tint="accent" />
            <span className="font-title text-[30px] text-ink">{sessionTitle[plan.type]}</span>
            <span className="text-[14px] text-muted">
              {isRestDay(plan)
                ? "Walk, stretch, sleep. Mark it done to move on."
                : `${plan.items.length} exercises · ~${estimatedMinutes(plan)} min`}
            </span>
          </div>
          <span className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <ArrowRight size={18} strokeWidth={2.75} />
          </span>
        </div>
        {!isRestDay(plan) && (
          <>
            <div className="flex items-center gap-4">
              <BodyDiagram muscles={planMuscles(plan)} showLabels={false} className="w-[120px] shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
                {plan.items.map((item) => (
                  <div key={item.exercise.id} className="flex items-baseline gap-1">
                    <span className="text-[14px] font-medium text-ink">{item.exercise.name}</span>
                    <span className="tabular ml-auto shrink-0 text-[13px] text-muted">{prescriptionLine(item.prescription)}</span>
                  </div>
                ))}
              </div>
            </div>
            {plan.isReentry && <div><Pill text="Re-entry week · bodyweight only" tint="rest" /></div>}
            {badge && <div><Pill text={badge} tint={plan.adjustment === "push" ? "good" : "rest"} /></div>}
          </>
        )}
      </Card>
    </Link>
  );
}

function PhaseSection({ phase, summary, days, done, today }: {
  phase: Phase; summary: string; days: DayPlan[]; done: Set<number>; today: number;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <h2 className="font-title text-[22px] text-ink">{phaseWeekLabel(phase)}</h2>
        <span className="text-[15px] font-medium" style={{ color: phase === "deload" ? "var(--rest)" : "var(--muted)" }}>
          {phaseInfo[phase].name}
        </span>
      </div>
      <p className="text-[14px] text-muted">{summary}</p>
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        {days.map((plan, i) => (
          <Link
            key={plan.day}
            href={`/day/${plan.day}`}
            className={`flex items-center gap-3.5 px-3.5 py-3 ${i > 0 ? "border-t border-line" : ""}`}
          >
            <span
              className="font-display tabular w-[30px] text-[22px] font-bold"
              style={{ color: plan.day === today ? "var(--accent)" : "var(--ink)" }}
            >
              {pad(plan.day)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-semibold" style={{ color: isRestDay(plan) ? "var(--muted)" : "var(--ink)" }}>
                {sessionTitle[plan.type]}
              </span>
              {!isRestDay(plan) && (
                <span className="truncate text-[12px] text-muted">{planFocus(plan).slice(0, 3).map(muscleName).join(" · ")}</span>
              )}
            </span>
            <span className="ml-auto shrink-0">
              {done.has(plan.day) ? (
                <CircleCheck size={22} className="text-surface" style={{ fill: isRestDay(plan) ? "var(--rest)" : "var(--good)" }} />
              ) : plan.day === today ? (
                <Pill text="Today" tint="accent" filled />
              ) : (
                <ChevronRight size={15} strokeWidth={2.5} className="text-line" />
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CompleteCard({ profile, nextLevel, growth, onStart }: {
  profile: Profile;
  nextLevel: number;
  growth: ReturnType<typeof ladderGrowth>;
  onStart: (level: number, growth: ReturnType<typeof ladderGrowth>) => void;
}) {
  const macro = macroForBlock(profile.block);
  const nextMacro = macroForBlock(profile.block + 1);
  const up = ladderMovements.filter((m) => (growth[m] ?? 0) > 0).map((m) => movementName[m]);
  const down = ladderMovements.filter((m) => (growth[m] ?? 0) < 0).map((m) => movementName[m]);
  const growthText = [
    up.length > 0 && `Moving up the ladder: ${up.join(", ")}.`,
    down.length > 0 && `Holding a rung lower: ${down.join(", ")}.`,
  ].filter(Boolean).join(" ") || "Log reps and kg during sessions so each movement can climb its ladder.";

  return (
    <Card className="flex flex-col gap-3">
      <span className="flex items-center gap-2 text-good">
        <Trophy size={16} className="fill-good" />
        <Eyebrow text={`Block ${profile.block} complete`} tint="good" />
      </span>
      <span className="font-title text-[28px] text-ink">30 days done.</span>
      <p className="text-[15px] text-ink">
        {nextMacro !== macro
          ? `Next up: ${macroInfo[nextMacro].name}. ${macroInfo[nextMacro].focus}`
          : `Block ${profile.block + 1} keeps the ${macroInfo[nextMacro].name} phase with fresh exercise variations.`}
      </p>
      <p className="text-[14px] text-muted">{growthText}</p>
      {nextLevel !== profile.level && (
        <p className="text-[14px] text-muted">
          {nextLevel > profile.level ? "Your ratings ran easy, so reps step up too." : "Your ratings ran very hard, so reps ease off a step."}
        </p>
      )}
      <PrimaryButton onClick={() => onStart(nextLevel, growth)}>
        <CircleArrowRight size={20} />
        Start Block {profile.block + 1}
      </PrimaryButton>
    </Card>
  );
}
