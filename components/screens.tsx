"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { bodyweight } from "@/lib/gear";
import { programLength } from "@/lib/program";
import type { Profile } from "@/lib/records";
import { Assessment } from "./assessment";
import { DayDetail } from "./day-detail";
import { EquipmentSetup } from "./equipment-setup";
import { ProgramHome } from "./program-home";
import { TrainingProgress } from "./progress";
import { Roadmap } from "./roadmap";
import { Settings } from "./settings";
import { useStore } from "./store";
import { Loading } from "./ui";

function LoadError({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="font-title text-[24px] text-ink">Can&apos;t reach your workout data</p>
      <p className="text-[14px] text-muted">{message}</p>
    </div>
  );
}

// First run walks through equipment, then the assessment, then lands on the program.
export function HomeScreen() {
  const { state, error } = useStore();
  if (!state) return error ? <LoadError message={error} /> : <Loading />;
  const { profile } = state;
  if (profile?.assessed) return <ProgramHome profile={profile} />;
  if (profile) return <Assessment profile={profile} />;
  return <EquipmentSetup initial={bodyweight} isEditing={false} />;
}

// Inner screens need a finished setup; without one they send the user back to start it.
function WithProfile({ render }: { render: (profile: Profile) => ReactNode }) {
  const { state, error } = useStore();
  const router = useRouter();
  const ready = state?.profile?.assessed ? state.profile : null;
  useEffect(() => {
    if (state && !ready) router.replace("/");
  }, [state, ready, router]);
  if (!state) return error ? <LoadError message={error} /> : <Loading />;
  return ready ? render(ready) : <Loading />;
}

export function DayScreen() {
  const day = Number(useParams<{ day: string }>().day);
  if (!Number.isInteger(day) || day < 1 || day > programLength) notFound();
  return <WithProfile render={(p) => <DayDetail day={day} profile={p} />} />;
}
export const SettingsScreen = () => <WithProfile render={(p) => <Settings profile={p} />} />;
export const EquipmentScreen = () => (
  <WithProfile render={(p) => <EquipmentSetup initial={{ dumbbells: p.dumbbells, kettlebells: p.kettlebells, bench: p.bench, pullUpBar: p.pullUpBar, band: p.band }} isEditing />} />
);
export const AssessmentScreen = () => <WithProfile render={(p) => <Assessment profile={p} isRetake />} />;
export const RoadmapScreen = () => <WithProfile render={(p) => <Roadmap profile={p} />} />;
export const ProgressScreen = () => <WithProfile render={(p) => <TrainingProgress profile={p} />} />;
