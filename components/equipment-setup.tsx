"use client";

import { Dumbbell, Minus, Plus, RectangleHorizontal, Spline, Weight, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { catalog } from "@/lib/exercise";
import { type Gear, bodyweight, gearSummary, isBodyweightOnly, needsMet } from "@/lib/gear";
import { PullUpBar } from "./icons";
import { RestoreBackupButton } from "./restore-backup";
import { useStore } from "./store";
import { Eyebrow, Group, PrimaryButton, SecondaryButton, Switch } from "./ui";

export function EquipmentSetup({ initial, isEditing }: { initial: Gear; isEditing: boolean }) {
  const { saveProfile } = useStore();
  const router = useRouter();
  const [gear, setGear] = useState(initial);
  const [saving, setSaving] = useState(false);

  // Exercises this gear unlocks across the whole year, warm-ups excluded.
  const exerciseCount = catalog.filter((e) => e.movement !== "warmup" && needsMet(e.needs, gear)).length;
  const set = (patch: Partial<Gear>) => setGear((g) => ({ ...g, ...patch }));

  async function save(chosen: Gear) {
    setSaving(true);
    try {
      await saveProfile(chosen);
      if (isEditing) router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-5 pt-safe">
      {isEditing && (
        <button type="button" onClick={() => router.back()} className="self-start pt-2 text-[17px] text-accent">Cancel</button>
      )}
      <div className="flex flex-col gap-2.5 pt-4">
        <Eyebrow text={isEditing ? "Edit equipment" : "Step 1 of 2"} tint="accent" />
        <h1 className="font-display text-[44px] text-ink">What do you have<br />at home?</h1>
        <p className="text-[16px] text-muted">The program only uses what you pick. Nothing picked means a bodyweight plan.</p>
      </div>

      <Group>
        <CountRow title="Dumbbells" detail="One unlocks goblet squats and rows, two unlock presses" Icon={Dumbbell}
          value={gear.dumbbells} onChange={(dumbbells) => set({ dumbbells })} />
        <CountRow title="Kettlebell" detail="Swings and goblet squats" Icon={Weight}
          value={gear.kettlebells} onChange={(kettlebells) => set({ kettlebells })} />
        <ToggleRow title="Bench" detail="Bench press, split squats, step-ups, dips" Icon={RectangleHorizontal}
          on={gear.bench} onChange={(bench) => set({ bench })} />
        <ToggleRow title="Pull-up bar" detail="Pull-ups and hanging knee raises" Icon={PullUpBar}
          on={gear.pullUpBar} onChange={(pullUpBar) => set({ pullUpBar })} />
        <ToggleRow title="Resistance band" detail="Rows and pull-aparts" Icon={Spline}
          on={gear.band} onChange={(band) => set({ band })} />
      </Group>

      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-ink">{gearSummary(gear)}</span>
        <span className="text-[14px] text-muted">{exerciseCount} exercises</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <PrimaryButton disabled={saving} onClick={() => save(gear)}>
          {isEditing ? "Save equipment" : isBodyweightOnly(gear) ? "Next: bodyweight plan" : "Next"}
        </PrimaryButton>
        {!isBodyweightOnly(gear) && (
          <SecondaryButton disabled={saving} onClick={() => save(bodyweight)}>Bodyweight only instead</SecondaryButton>
        )}
        {!isEditing && <RestoreBackupButton />}
      </div>
    </div>
  );
}

function RowIcon({ Icon, active }: { Icon: LucideIcon | typeof PullUpBar; active: boolean }) {
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${active ? "bg-ink text-on-ink" : "bg-canvas text-muted"}`}>
      <Icon size={19} strokeWidth={2.25} />
    </span>
  );
}

function RowText({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[16px] font-semibold text-ink">{title}</span>
      <span className="text-[13px] text-muted">{detail}</span>
    </div>
  );
}

function CountRow({ title, detail, Icon, value, onChange, max = 2 }: {
  title: string; detail: string; Icon: LucideIcon; value: number; onChange: (value: number) => void; max?: number;
}) {
  const step = (enabled: boolean, delta: number, label: string, glyph: React.ReactNode) => (
    <button
      type="button"
      aria-label={`${label} ${title}`}
      disabled={!enabled}
      onClick={() => onChange(value + delta)}
      className="flex size-[34px] items-center justify-center rounded-full bg-canvas"
      style={{ color: enabled ? "var(--ink)" : "var(--line)" }}
    >
      {glyph}
    </button>
  );
  return (
    <div className="flex items-center gap-3.5 p-3.5">
      <RowIcon Icon={Icon} active={value > 0} />
      <RowText title={title} detail={detail} />
      <div className="ml-auto flex shrink-0 items-center" aria-label={title} aria-valuenow={value} role="spinbutton">
        {step(value > 0, -1, "Fewer", <Minus size={15} strokeWidth={3} />)}
        <span className="font-display tabular w-7 text-center text-[24px] font-bold">{value}</span>
        {step(value < max, 1, "More", <Plus size={15} strokeWidth={3} />)}
      </div>
    </div>
  );
}

function ToggleRow({ title, detail, Icon, on, onChange }: {
  title: string; detail: string; Icon: LucideIcon | typeof PullUpBar; on: boolean; onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3.5 p-3.5" onClick={() => onChange(!on)}>
      <RowIcon Icon={Icon} active={on} />
      <RowText title={title} detail={detail} />
      <div className="ml-auto pl-2">
        <Switch on={on} onChange={onChange} label={title} />
      </div>
    </div>
  );
}
