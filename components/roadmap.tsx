"use client";

import { Circle, CircleCheck, CircleDot, RotateCw } from "lucide-react";
import {
  type MacroPhase, contextYear, macroForBlock, macroInfo, macroPhases, routeInfo, sessionTitle, weekCycle,
} from "@/lib/program";
import { type Profile, completedDays, inBlock, profileContext } from "@/lib/records";
import { macroIcon } from "./icon-maps";
import { PageHeader } from "./page-header";
import { useStore } from "./store";
import { Eyebrow, Pill } from "./ui";

export function Roadmap({ profile }: { profile: Profile }) {
  const { state } = useStore();
  const context = profileContext(profile);
  const year = contextYear(context);
  const daysDone = completedDays(inBlock(state?.logs ?? [], profile.block)).size;

  return (
    <>
      <PageHeader title="Your year" />
      <div className="flex flex-col gap-[22px] p-5 pb-10">
        <div className="flex flex-col gap-2">
          <Eyebrow text={`${routeInfo[profile.route].name} route`} tint="accent" />
          <h2 className="font-display text-[48px] text-ink">Year {year}</h2>
          <p className="text-[15px] text-muted">
            12 blocks of 30 days. Each phase changes how you train; each block rotates the exercises; each movement climbs its own
            ladder as you hit your targets.
          </p>
        </div>
        {macroPhases.map((phase) => (
          <PhaseCard key={phase} phase={phase} profile={profile} year={year} daysDone={daysDone} />
        ))}
        <p className="flex items-center gap-2 text-[14px] text-muted">
          <RotateCw size={15} className="shrink-0" />
          After block 12 the year starts again one rung harder on every ladder.
        </p>
      </div>
    </>
  );
}

function PhaseCard({ phase, profile, year, daysDone }: { phase: MacroPhase; profile: Profile; year: number; daysDone: number }) {
  const isCurrent = phase === macroForBlock(profile.block);
  const firstBlock = (year - 1) * 12 + macroPhases.indexOf(phase) * 3 + 1;
  const sessions = weekCycle(phase, profile.route).filter((s) => s !== "rest");
  const titles = [...new Set(sessions.map((s) => sessionTitle[s]))];
  const Icon = macroIcon[phase];
  return (
    <div
      className="flex flex-col gap-3 rounded-[14px] bg-surface p-[18px]"
      style={{ border: isCurrent ? "2px solid var(--accent)" : "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={22} style={{ color: isCurrent ? "var(--accent)" : "var(--muted)" }} />
        <div className="flex flex-col gap-0.5">
          <span className="font-title text-[24px] text-ink">{macroInfo[phase].name}</span>
          <span className="text-[13px] font-medium text-muted">{macroInfo[phase].months}</span>
        </div>
        {isCurrent && <span className="ml-auto"><Pill text="Now" tint="accent" filled /></span>}
      </div>
      <p className="text-[15px] text-ink">{macroInfo[phase].focus}</p>
      <p className="text-[13px] text-muted">{sessions.length} training days a week: {titles.join(" · ")}</p>
      <div className="flex gap-2">
        {[0, 1, 2].map((offset) => {
          const block = firstBlock + offset;
          const isDone = block < profile.block;
          const current = block === profile.block;
          return (
            <div key={block} className="flex flex-1 flex-col items-center gap-1 rounded-[10px] bg-canvas py-2.5">
              {isDone ? (
                <CircleCheck size={18} className="fill-good text-surface" />
              ) : current ? (
                <CircleDot size={18} className="text-accent" />
              ) : (
                <Circle size={18} className="text-line" />
              )}
              <span className="text-[13px] font-semibold text-ink">Block {((block - 1) % 12) + 1}</span>
              <span className="text-[11px] text-muted">{isDone ? "Done" : current ? `Day ${Math.min(30, daysDone + 1)} of 30` : "Upcoming"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
