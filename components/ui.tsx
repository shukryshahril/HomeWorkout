"use client";

import { MonitorPlay, TvMinimalPlay, X } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, type ReactNode, useEffect, useRef } from "react";

export type Tint = "accent" | "ink" | "good" | "rest" | "muted";

export const tintColor = (tint: Tint) => `var(--${tint})`;
// Text drawn on a filled tint.
export const onFill = (tint: Tint) => (tint === "ink" ? "var(--on-ink)" : "#fff");

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export function Eyebrow({ text, tint = "muted", className }: { text: string; tint?: Tint; className?: string }) {
  return (
    <span
      className={cx("text-[12px] font-semibold uppercase tracking-[0.08em]", className)}
      style={{ color: tintColor(tint) }}
    >
      {text}
    </span>
  );
}

export function Pill({ text, tint = "ink", filled = false, tall = false }: { text: string; tint?: Tint; filled?: boolean; tall?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-semibold",
        tall ? "h-9 px-3.5 text-[14px]" : "px-2.5 py-[5px] text-[12px]",
      )}
      style={{
        color: filled ? onFill(tint) : tintColor(tint),
        background: filled ? tintColor(tint) : "transparent",
        borderColor: filled ? "transparent" : `color-mix(in srgb, ${tintColor(tint)} 35%, transparent)`,
      }}
    >
      {text}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("w-full rounded-[14px] border border-line bg-surface p-[18px]", className)}>{children}</div>;
}

// Rounded group of rows with hairline dividers.
export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-[14px] border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line", className)}>
      {children}
    </div>
  );
}

type ButtonProps = ComponentProps<"button"> & { tint?: Tint };

export function PrimaryButton({ tint = "accent", className, style, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        "flex w-full items-center justify-center gap-2 rounded-[12px] py-4 text-[17px] font-bold transition-opacity active:opacity-80 disabled:cursor-default",
        className,
      )}
      style={{ background: tintColor(tint), color: onFill(tint), ...style }}
      {...props}
    />
  );
}

export function SecondaryButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cx(
        "flex w-full items-center justify-center gap-2 rounded-[12px] border border-line bg-surface py-[15px] text-[17px] font-semibold text-ink active:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function CircleIconButton({ icon, label, href, onClick }: { icon: ReactNode; label: string; href?: string; onClick?: () => void }) {
  const inner = (
    <span className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink">{icon}</span>
  );
  const className = "flex size-11 shrink-0 items-center justify-center";
  return href ? (
    <Link href={href} aria-label={label} className={className}>{inner}</Link>
  ) : (
    <button type="button" aria-label={label} onClick={onClick} className={className}>{inner}</button>
  );
}

export function ChipButton({ title, icon, on = false, onClick }: { title: string; icon: ReactNode; on?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-semibold",
        on ? "border-transparent bg-ink text-on-ink" : "border-line bg-surface text-ink",
      )}
    >
      {icon}
      {title}
    </button>
  );
}

export function VideoToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <ChipButton
      title={on ? "Hide video" : "Form video"}
      icon={on ? <MonitorPlay size={16} /> : <TvMinimalPlay size={16} />}
      on={on}
      onClick={() => onChange(!on)}
    />
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors"
      style={{ background: on ? "var(--accent)" : "var(--line)" }}
    >
      <span
        className="absolute top-[2px] size-[27px] rounded-full bg-white shadow transition-[left]"
        style={{ left: on ? 22 : 2 }}
      />
    </button>
  );
}

export function Segmented<T extends string | boolean>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-[9px] bg-line/70 p-[2px]" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-[7px] py-1.5 text-[13px] font-semibold",
            o.value === value ? "bg-surface text-ink shadow-sm" : "text-ink/80",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Bottom sheet over the page; closes on backdrop tap or Escape.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 mx-auto mt-auto max-h-[92dvh] w-full max-w-[520px] overflow-hidden rounded-t-[20px] bg-canvas p-0 text-ink backdrop:bg-black/40"
    >
      {open && (
        <div className="max-h-[92dvh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-canvas/90 px-5 pb-2 pt-4 backdrop-blur">
            <span className="text-[15px] font-semibold">{title}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full bg-line text-ink">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="px-5 pb-safe">{children}</div>
        </div>
      )}
    </dialog>
  );
}

// Action-sheet style confirmation with a title, optional message and stacked buttons.
export function Confirm({ open, title, message, actions, onCancel, cancelLabel = "Cancel" }: {
  open: boolean;
  title: string;
  message?: string;
  actions: { label: string; destructive?: boolean; onClick: () => void }[];
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="m-0 mx-auto mt-auto w-full max-w-[520px] bg-transparent p-3 pb-safe text-ink backdrop:bg-black/40"
    >
      <div className="overflow-hidden rounded-[14px] bg-surface text-center">
        <div className="px-4 py-3.5">
          <p className="text-[13px] font-semibold text-muted">{title}</p>
          {message && <p className="mt-1 text-[13px] text-muted">{message}</p>}
        </div>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="block w-full border-t border-line py-3.5 text-[17px]"
            style={{ color: a.destructive ? "#e5484d" : "var(--accent)" }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel} className="mt-2 w-full rounded-[14px] bg-surface py-3.5 text-[17px] font-semibold text-accent">
        {cancelLabel}
      </button>
    </dialog>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-[3px] border-line border-t-accent" aria-label="Loading" />
    </div>
  );
}
