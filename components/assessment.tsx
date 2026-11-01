"use client";

import { BicepsFlexed, Calendar, CircleCheck, Circle, HeartPulse, PersonStanding, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { type Route, routeInfo, routes } from "@/lib/program";
import type { Profile } from "@/lib/records";
import { levelIcon, routeIcon } from "./icon-maps";
import { useStore } from "./store";
import { Eyebrow, PrimaryButton } from "./ui";

export const startingLevels: Record<number, { name: string; summary: string }> = {
  [-2]: { name: "Re-entry", summary: "Week 1 is bodyweight only with one set less. Weights come in from week 2, and reps start low." },
  [-1]: { name: "Returning", summary: "Equipment from day 1, but light loads and fewer reps while your body gets used to training again." },
  0: { name: "Standard", summary: "The program as designed: base reps in week 1, building to the peak test on day 30." },
  1: { name: "Experienced", summary: "Starts one rep step above the base program." },
};

type Answers = {
  // 0 now, 1 recent, 2 a while ago, 3 long ago or never.
  lastTrained: number | null;
  pushUps: number | null;
  squats: number | null;
  jointPain: boolean | null;
  route: Route | null;
};

function startingLevel(a: Answers): number | null {
  if (a.lastTrained === null || a.pushUps === null || a.squats === null || a.jointPain === null) return null;
  const score = 3 - a.lastTrained + a.pushUps + a.squats;
  let level = score <= 2 ? -2 : score <= 4 ? -1 : score <= 6 ? 0 : 1;
  // Tendons and joints detrain slower to recover than muscle, so long breaks and pain cap the start.
  if (a.lastTrained === 3 || a.jointPain) level = Math.min(level, -1);
  return level;
}

export function Assessment({ profile, isRetake = false }: { profile: Profile; isRetake?: boolean }) {
  const { saveProfile } = useStore();
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({
    lastTrained: null, pushUps: null, squats: null, jointPain: null, route: isRetake ? profile.route : null,
  });
  const level = startingLevel(answers);
  const isComplete = level !== null && answers.route !== null;
  const answer = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));

  async function finish(chosen: number) {
    await saveProfile({ level: chosen, route: answers.route ?? "balanced", assessed: true });
    if (isRetake) router.back();
  }

  const LevelIcon = level !== null ? levelIcon[level] : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-between px-5 pt-safe">
        {isRetake ? (
          <button type="button" onClick={() => router.back()} className="pt-2 text-[17px] text-accent">Cancel</button>
        ) : (
          <button type="button" onClick={() => finish(0)} className="ml-auto pt-2 text-[17px] text-accent">Skip</button>
        )}
      </div>
      <div className="flex flex-col gap-[26px] p-5">
        <div className="flex flex-col gap-2.5 pt-2">
          <Eyebrow text={isRetake ? "Retake assessment" : "Step 2 of 2"} tint="accent" />
          <h1 className="font-display text-[44px] text-ink">Where are you<br />starting from?</h1>
          <p className="text-[16px] text-muted">
            Five quick questions set how hard day 1 is and what the year focuses on. Be honest, the program ramps up either way.
          </p>
        </div>

        <Question title="When did you last train regularly?" icon={<Calendar size={18} />}>
          <Options
            values={[0, 1, 2, 3]}
            selected={answers.lastTrained}
            onSelect={(lastTrained) => answer({ lastTrained })}
            label={(v) => ["I train now", "Within the last 6 months", "6 months to 2 years ago", "Over 2 years ago, or never"][v]}
          />
        </Question>
        <Question title="Push-ups in a row, good form?" icon={<BicepsFlexed size={18} />}>
          <Options
            values={[0, 1, 2, 3]}
            selected={answers.pushUps}
            onSelect={(pushUps) => answer({ pushUps })}
            label={(v) => ["0 to 2", "3 to 10", "11 to 20", "More than 20"][v]}
          />
        </Question>
        <Question title="Bodyweight squats without stopping?" icon={<PersonStanding size={18} />}>
          <Options
            values={[0, 1, 2]}
            selected={answers.squats}
            onSelect={(squats) => answer({ squats })}
            label={(v) => ["Under 10", "10 to 25", "More than 25"][v]}
          />
        </Question>
        <Question title="Any knee, back or shoulder pain lately?" icon={<HeartPulse size={18} />}>
          <Options
            values={[false, true]}
            selected={answers.jointPain}
            onSelect={(jointPain) => answer({ jointPain })}
            label={(v) => (v ? "Yes, sometimes" : "No")}
          />
        </Question>
        <Question title="What's your main goal?" icon={<Target size={18} />}>
          <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
            {routes.map((route, i) => {
              const on = answers.route === route;
              const Icon = routeIcon[route];
              return (
                <button
                  key={route}
                  type="button"
                  aria-pressed={on}
                  onClick={() => answer({ route })}
                  className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <Icon size={19} className="w-[26px] shrink-0" style={{ color: on ? "var(--accent)" : "var(--muted)" }} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[16px] font-semibold text-ink">{routeInfo[route].name}</span>
                    <span className="text-[13px] text-muted">{routeInfo[route].summary}</span>
                  </span>
                  <Check on={on} />
                </button>
              );
            })}
          </div>
        </Question>

        <p className="text-[13px] text-muted">Not sure about a number? Try it now and count, then come back.</p>
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 bg-canvas px-5 pb-safe pt-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {level !== null && LevelIcon && (
          <div className="flex items-start gap-3">
            <LevelIcon size={22} className="mt-0.5 w-7 shrink-0 text-accent" />
            <div className="flex flex-col gap-1">
              <span className="font-title text-[22px] text-ink">Start at {startingLevels[level].name}</span>
              <span className="text-[14px] text-muted">{startingLevels[level].summary}</span>
              {answers.jointPain && (
                <span className="text-[13px] font-medium text-rest">
                  Stop any exercise that causes sharp pain, and check with a physio if it persists.
                </span>
              )}
            </div>
          </div>
        )}
        <PrimaryButton tint={isComplete ? "accent" : "muted"} disabled={!isComplete} onClick={() => level !== null && finish(level)}>
          {isRetake ? "Update my program" : "Start my 30 days"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Question({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-ink">
        <span className="text-accent">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Check({ on }: { on: boolean }) {
  return on ? (
    <CircleCheck size={22} className="ml-auto shrink-0 fill-accent text-surface" />
  ) : (
    <Circle size={22} className="ml-auto shrink-0 text-line" />
  );
}

function Options<T extends number | boolean>({ values, selected, onSelect, label }: {
  values: T[]; selected: T | null; onSelect: (value: T) => void; label: (value: T) => string;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      {values.map((value, i) => (
        <button
          key={String(value)}
          type="button"
          aria-pressed={selected === value}
          onClick={() => onSelect(value)}
          className={`flex w-full items-center px-3.5 py-[13px] text-left text-[16px] text-ink ${i > 0 ? "border-t border-line" : ""}`}
        >
          {label(value)}
          <Check on={selected === value} />
        </button>
      ))}
    </div>
  );
}
