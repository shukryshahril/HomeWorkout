"use client";

import { Check, ChevronRight, Download, Upload } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";
import { gearSummary } from "@/lib/gear";
import { routeInfo, routes } from "@/lib/program";
import { type Profile, accentChoices, accentColor, kgText, ownedWeights, profileGear } from "@/lib/records";
import { startingLevels } from "./assessment";
import { routeIcon } from "./icon-maps";
import { PageHeader } from "./page-header";
import { useStore } from "./store";
import { Confirm, Eyebrow, Segmented, Switch } from "./ui";

type PendingImport = { backup: unknown; exportedAt: string; logCount: number };

const fieldClass = "w-full rounded-[12px] border border-line bg-surface p-3.5 text-[16px] text-ink outline-none focus:border-accent";

export function Settings({ profile }: { profile: Profile }) {
  const { state, saveSettings, saveProfile, restoreBackup } = useStore();
  const settings = state!.settings;
  const [name, setName] = useState(settings.userName);
  const [weights, setWeights] = useState(profile.dumbbellWeights);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const parsedWeights = ownedWeights({ ...profile, dumbbellWeights: weights });

  async function readBackup(file: File) {
    try {
      const backup = JSON.parse(await file.text());
      if (!backup || !Array.isArray(backup.logs)) throw new Error();
      setPending({ backup, exportedAt: backup.exportedAt, logCount: backup.logs.length });
    } catch {
      setDataMessage("That file isn't a Home Workout backup.");
    }
  }

  async function confirmImport() {
    if (!pending) return;
    const { backup, logCount } = pending;
    setPending(null);
    try {
      await restoreBackup(backup);
      setDataMessage(`Restored ${logCount} logged days.`);
    } catch (error) {
      setDataMessage(`Import failed: ${(error as Error).message}`);
    }
  }

  const exportedAt = pending ? new Date(pending.exportedAt) : null;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-[26px] p-5 pb-10">
        <Section title="You">
          <input
            className={fieldClass}
            placeholder="Your first name"
            autoComplete="given-name"
            enterKeyHint="done"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== settings.userName && saveSettings({ userName: name })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <Note>Used for the greeting on the home screen.</Note>
        </Section>

        <Section title="Appearance">
          <Segmented
            options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
            value={settings.appearance}
            onChange={(appearance) => saveSettings({ appearance })}
          />
        </Section>

        <Section title="Accent colour">
          <div className="flex">
            {accentChoices.map((choice) => {
              const on = settings.accent === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={on}
                  aria-label={choice}
                  onClick={() => saveSettings({ accent: choice })}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="rounded-full border-2 p-1" style={{ borderColor: on ? accentColor[choice] : "transparent" }}>
                    <span className="flex size-10 items-center justify-center rounded-full text-white" style={{ background: accentColor[choice] }}>
                      {on && <Check size={17} strokeWidth={3} />}
                    </span>
                  </span>
                  <span className={`text-[12px] capitalize ${on ? "font-semibold text-ink" : "text-muted"}`}>{choice}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Route">
          <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
            {routes.map((route, i) => {
              const on = profile.route === route;
              const Icon = routeIcon[route];
              return (
                <button
                  key={route}
                  type="button"
                  aria-pressed={on}
                  onClick={() => saveProfile({ route })}
                  className={`flex w-full items-center gap-3 p-3.5 text-left ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <Icon size={18} className="w-6 shrink-0" style={{ color: on ? "var(--accent)" : "var(--muted)" }} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[16px] font-medium text-ink">{routeInfo[route].name}</span>
                    <span className="text-[13px] text-muted">{routeInfo[route].summary}</span>
                  </span>
                  {on && <Check size={16} strokeWidth={3} className="ml-auto shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>
          <Note>Switching keeps your progress; future days follow the new route.</Note>
        </Section>

        {profile.dumbbells > 0 && (
          <Section title="Dumbbell weights">
            <input
              className={fieldClass}
              placeholder="e.g. 5, 7.5, 10, 12.5"
              inputMode="decimal"
              value={weights}
              maxLength={200}
              onChange={(e) => setWeights(e.target.value)}
              onBlur={() => weights !== profile.dumbbellWeights && saveProfile({ dumbbellWeights: weights })}
            />
            <Note>
              {parsedWeights.length === 0
                ? "List the kg you can load, so the app knows the next step up when you hit every rep."
                : "Suggestions step through: " + parsedWeights.map((kg) => `${kgText(kg)} kg`).join(" → ")}
            </Note>
          </Section>
        )}

        <Section title="Workout">
          <div className="flex items-center gap-3 rounded-[12px] border border-line bg-surface p-3.5" onClick={() => saveSettings({ showFormVideo: !settings.showFormVideo })}>
            <span className="flex flex-col gap-0.5">
              <span className="text-[16px] font-medium text-ink">Show form video by default</span>
              <span className="text-[13px] text-muted">You can still flip it during a session.</span>
            </span>
            <span className="ml-auto">
              <Switch on={settings.showFormVideo} onChange={(showFormVideo) => saveSettings({ showFormVideo })} label="Show form video by default" />
            </span>
          </div>
          <LinkRow
            href="/settings/assessment"
            title="Starting level"
            detail={startingLevels[profile.level]?.name ?? `Block ${profile.block}, level ${profile.level}`}
            trailing={<span className="text-[14px] font-semibold text-accent">Retake</span>}
          />
          <LinkRow href="/settings/equipment" title="Equipment" detail={gearSummary(profileGear(profile))} />
        </Section>

        <Section title="Your data">
          <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
            <a href="/api/backup" download onClick={() => setDataMessage("Backup downloaded. Keep it somewhere safe.")}>
              <DataRow icon={<Upload size={18} />} title="Export backup" detail="Save workouts, ratings and settings as a file" />
            </a>
            <button type="button" className="block w-full border-t border-line text-left" onClick={() => importInput.current?.click()}>
              <DataRow icon={<Download size={18} />} title="Import backup" detail="Replace this server's data with a backup file" />
            </button>
          </div>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void readBackup(file);
            }}
          />
          <p className={`text-[13px] ${dataMessage ? "text-ink" : "text-muted"}`}>
            {dataMessage ?? "Data lives in the HomeWorkout server's database on your PC. Export a backup to keep a separate copy."}
          </p>
        </Section>

        <p className="text-[12px] text-muted">Anatomy artwork: react-native-body-highlighter (MIT).</p>
      </div>

      <Confirm
        open={pending !== null}
        title="Replace all data with this backup?"
        message={exportedAt && !Number.isNaN(exportedAt.getTime())
          ? `The backup from ${exportedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} has ${pending?.logCount} logged days. Current data will be overwritten.`
          : `The backup has ${pending?.logCount} logged days. Current data will be overwritten.`}
        actions={[{ label: "Replace with backup", destructive: true, onClick: confirmImport }]}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <Eyebrow text={title} />
      {children}
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-muted">{children}</p>;
}

function LinkRow({ href, title, detail, trailing }: { href: string; title: string; detail: string; trailing?: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-[12px] border border-line bg-surface p-3.5">
      <span className="flex flex-col gap-0.5">
        <span className="text-[16px] font-medium text-ink">{title}</span>
        <span className="text-[13px] text-muted">{detail}</span>
      </span>
      <span className="ml-auto flex items-center gap-2">
        {trailing}
        <ChevronRight size={15} strokeWidth={2.5} className="text-muted" />
      </span>
    </Link>
  );
}

function DataRow({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <span className="flex items-center gap-3.5 p-3.5">
      <span className="w-[26px] shrink-0 text-accent">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[16px] font-medium text-ink">{title}</span>
        <span className="text-[13px] text-muted">{detail}</span>
      </span>
    </span>
  );
}
