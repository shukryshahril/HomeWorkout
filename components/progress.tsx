"use client";

import { BicepsFlexed, Layers } from "lucide-react";
import { type ReactNode, useState } from "react";
import { type Exercise, exerciseById, ladder, ladderMovements, movementName, type Movement } from "@/lib/exercise";
import { needsMet } from "@/lib/gear";
import { macroForBlock, pick, targetTier } from "@/lib/program";
import { type Profile, type SetLog, kgText, profileContext, setScore } from "@/lib/records";
import { BarChart, LineChart } from "./charts";
import { macroIcon } from "./icon-maps";
import { PageHeader } from "./page-header";
import { useStore } from "./store";
import { Eyebrow } from "./ui";

const shortDate = (time: number | Date) => new Date(time).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// Monday 00:00 of the week containing `date`, in local time.
function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function TrainingProgress({ profile }: { profile: Profile }) {
  const { state } = useStore();
  const workouts = state?.logs ?? [];
  const sets = state?.sets ?? [];
  const trainingSessions = workouts.filter((w) => w.setsDone > 0).length;
  const MacroIcon = macroIcon[macroForBlock(profile.block)];

  // Sets logged per calendar week for the last 12 weeks, zero-filled so gaps show.
  const counts = new Map<number, number>();
  for (const s of sets) {
    const key = weekStart(new Date(s.date)).getTime();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const thisWeek = weekStart(new Date());
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const week = new Date(thisWeek);
    week.setDate(week.getDate() - 7 * (11 - i));
    return { key: String(week.getTime()), label: shortDate(week), caption: `Week of ${shortDate(week)}`, value: counts.get(week.getTime()) ?? 0 };
  });

  return (
    <>
      <PageHeader title="Progress" />
      <div className="flex flex-col gap-6 p-5 pb-10">
        <div className="flex gap-2.5">
          <StatTile value={trainingSessions} label="Sessions" icon={<BicepsFlexed size={16} />} />
          <StatTile value={sets.length} label="Sets" icon={<Layers size={16} />} />
          <StatTile value={profile.block} label="Block" icon={<MacroIcon size={16} />} />
        </div>

        <section className="flex flex-col gap-2.5">
          <h2 className="font-title text-[22px] text-ink">Sets per week</h2>
          <BarChart bars={weekly} unit="sets" label="Sets per week over the last 12 weeks" />
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="font-title text-[22px] text-ink">Movement ladders</h2>
          <p className="text-[14px] text-muted">
            Where each movement sits right now. Hitting your targets in a block&apos;s heavy weeks moves it up a rung.
          </p>
          <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {ladderMovements.map((movement, i) => (
              <LadderRow key={movement} movement={movement} profile={profile} divided={i > 0} />
            ))}
          </div>
        </section>

        <History sets={sets} />
      </div>
    </>
  );
}

function StatTile({ value, label, icon }: { value: number; label: string; icon: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-[14px] border border-line bg-surface p-3.5">
      <span className="text-accent">{icon}</span>
      <span className="font-display text-[32px] font-bold text-ink">{value}</span>
      <Eyebrow text={label} className="truncate" />
    </div>
  );
}

function LadderRow({ movement, profile, divided }: { movement: Movement; profile: Profile; divided: boolean }) {
  const context = profileContext(profile);
  const tier = targetTier(context, movement);
  const available = ladder(movement).filter((e) => needsMet(e.needs, context.gear));
  const current = pick([movement], context, 0, new Set());
  const next = available.find((e) => e.tier > (current?.tier ?? tier));
  const maxTier = Math.max(1, ...available.map((e) => e.tier));
  return (
    <div className={`flex items-center gap-3 p-3.5 ${divided ? "border-t border-line" : ""}`}>
      <div className="flex flex-col gap-[3px]">
        <span className="text-[15px] font-semibold text-ink">{movementName[movement]}</span>
        <span className="text-[13px] text-muted">{current?.name ?? "Needs more equipment"}</span>
        {next && <span className="text-[12px] font-medium text-accent">Next: {next.name}</span>}
      </div>
      <div className="ml-auto flex h-7 items-end gap-1" role="img" aria-label={`Rung ${current?.tier ?? 0} of ${maxTier}`}>
        {[1, 2, 3, 4, 5].map((rung) => (
          <span
            key={rung}
            className="w-2 rounded-[2px]"
            style={{
              height: 8 + rung * 4,
              background: rung <= (current?.tier ?? 0) ? "var(--accent)" : "var(--line)",
              opacity: rung <= (current?.tier ?? 0) || rung <= maxTier ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function History({ sets }: { sets: SetLog[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const seen = new Set<string>();
  const logged: Exercise[] = [];
  for (const s of [...sets].reverse()) {
    if (seen.has(s.exerciseID)) continue;
    seen.add(s.exerciseID);
    const exercise = exerciseById(s.exerciseID);
    if (exercise) logged.push(exercise);
  }
  const exerciseID = selected ?? logged[0]?.id ?? null;

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-title text-[22px] text-ink">Exercise history</h2>
      {logged.length === 0 || !exerciseID ? (
        <p className="text-[14px] text-muted">Finish a session and log your sets to see each exercise trend here.</p>
      ) : (
        <>
          <select
            value={exerciseID}
            onChange={(e) => setSelected(e.target.value)}
            className="self-start rounded-[10px] border border-line bg-surface px-3 py-2 text-[15px] font-semibold text-ink"
          >
            {logged.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <HistoryChart sets={sets.filter((s) => s.exerciseID === exerciseID)} />
        </>
      )}
    </section>
  );
}

function HistoryChart({ sets }: { sets: SetLog[] }) {
  const groups = new Map<string, SetLog[]>();
  for (const s of sets) groups.set(`${s.block}-${s.day}`, [...(groups.get(`${s.block}-${s.day}`) ?? []), s]);
  // Best set per session, dated by the session's last logged set.
  const sessions = [...groups.entries()].map(([key, group]) => {
    const best = group.reduce((a, b) => (setScore(b) > setScore(a) ? b : a));
    const label = best.weightKg !== null ? `${kgText(best.weightKg)} kg × ${best.reps ?? 0}`
      : best.seconds !== null ? `${best.seconds}s` : `${best.reps ?? 0} reps`;
    const time = Math.max(...group.map((s) => new Date(s.date).getTime()));
    return { key, time, value: setScore(best), valueLabel: label, caption: shortDate(time) };
  }).sort((a, b) => a.time - b.time);
  const unit = sets.some((s) => s.weightKg !== null) ? "kg" : sets.some((s) => s.seconds !== null) ? "seconds" : "reps";
  const last = sessions[sessions.length - 1];

  return (
    <div className="flex flex-col gap-2">
      {last && <p className="text-[14px] font-semibold text-ink">Latest best: {last.valueLabel}</p>}
      <LineChart points={sessions} unit={unit} label={`Best set per session, in ${unit}`} formatTick={shortDate} />
    </div>
  );
}
