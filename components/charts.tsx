"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

// SVG charts with one accent series, hairline grid,
// muted axis text, tap/hover readouts, and a screen-reader table so values never depend on the tooltip.

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// Round 0-based ticks: 1, 2 or 5 times a power of ten, about four of them.
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = 0; t < max + step; t += step) ticks.push(Math.round(t * 100) / 100);
  return ticks;
}

const tickText = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n));

const height = 180;
const pad = { top: 22, right: 8, bottom: 22, left: 30 };

function Tooltip({ x, width, value, caption }: { x: number; width: number; value: string; caption: string }) {
  const left = Math.min(Math.max(x, 50), width - 50);
  return (
    <div
      className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-[8px] border border-line bg-surface px-2 py-1 text-center shadow-sm"
      style={{ left }}
    >
      <div className="text-[13px] font-bold text-ink">{value}</div>
      <div className="text-[11px] text-muted">{caption}</div>
    </div>
  );
}

function Frame({ children, label, table }: { children: ReactNode; label: string; table: ReactNode }) {
  return (
    <figure className="rounded-[14px] border border-line bg-surface p-3.5" aria-label={label}>
      {children}
      <table className="sr-only">{table}</table>
    </figure>
  );
}

export type Bar = { key: string; label: string; caption: string; value: number };

// Columns from a shared baseline; the tapped column stays solid while the rest fade back.
export function BarChart({ bars, unit, label, axisEvery = 3 }: { bars: Bar[]; unit: string; label: string; axisEvery?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(...bars.map((b) => b.value)));
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const slot = bars.length > 0 ? plotW / bars.length : 0;
  const barW = Math.min(24, slot * 0.6);
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const last = bars.length - 1;

  return (
    <Frame
      label={label}
      table={
        <tbody>
          {bars.map((b) => <tr key={b.key}><th>{b.caption}</th><td>{b.value} {unit}</td></tr>)}
        </tbody>
      }
    >
      <div ref={ref} className="relative" style={{ height }} onPointerLeave={() => setSelected(null)}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible" aria-hidden>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">{tickText(t)}</text>
              </g>
            ))}
            {bars.map((b, i) => {
              const cx = pad.left + slot * i + slot / 2;
              const h = Math.max(0, y(0) - y(b.value));
              const r = Math.min(4, h, barW / 2);
              const x0 = cx - barW / 2;
              const x1 = cx + barW / 2;
              const yTop = y(0) - h;
              return (
                <g key={b.key}>
                  {h > 0 && (
                    <path
                      d={`M${x0},${y(0)}V${yTop + r}Q${x0},${yTop} ${x0 + r},${yTop}H${x1 - r}Q${x1},${yTop} ${x1},${yTop + r}V${y(0)}Z`}
                      fill="var(--accent)"
                      opacity={selected === null || selected === i ? 1 : 0.35}
                    />
                  )}
                  {/* Selective direct label: the current period's value on its cap. */}
                  {i === last && selected === null && (
                    <text x={cx} y={yTop - 5} textAnchor="middle" className="fill-ink text-[11px] font-semibold tabular">{b.value}</text>
                  )}
                  {i % axisEvery === last % axisEvery && (
                    <text x={cx} y={height - 4} textAnchor="middle" className="fill-muted text-[11px]">{b.label}</text>
                  )}
                  <rect
                    x={pad.left + slot * i}
                    y={pad.top}
                    width={slot}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${b.caption}: ${b.value} ${unit}`}
                    className="pointer-events-auto outline-none"
                    onPointerEnter={() => setSelected(i)}
                    onPointerDown={() => setSelected(i)}
                    onFocus={() => setSelected(i)}
                    onBlur={() => setSelected(null)}
                  />
                </g>
              );
            })}
          </svg>
        )}
        {selected !== null && bars[selected] && (
          <Tooltip
            x={pad.left + slot * selected + slot / 2}
            width={width}
            value={`${bars[selected].value} ${unit}`}
            caption={bars[selected].caption}
          />
        )}
      </div>
    </Frame>
  );
}

export type Point = { key: string; time: number; value: number; valueLabel: string; caption: string };

// One series over time: 2px line, ringed markers, and a crosshair that snaps to the nearest session.
export function LineChart({ points, unit, label, formatTick }: {
  points: Point[]; unit: string; label: string; formatTick: (time: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(0, ...points.map((p) => p.value)));
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - pad.left - pad.right - 8);
  const plotH = height - pad.top - pad.bottom;
  const day = 86_400_000;
  const minT = points.length > 0 ? Math.min(...points.map((p) => p.time)) : 0;
  const maxT = points.length > 0 ? Math.max(...points.map((p) => p.time)) : 0;
  const [t0, t1] = minT === maxT ? [minT - day, maxT + day] : [minT, maxT];
  const x = (t: number) => pad.left + 8 + ((t - t0) / (t1 - t0)) * plotW;
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const axisTimes = points.length <= 1 ? points.map((p) => p.time) : [t0, (t0 + t1) / 2, t1];

  function nearest(clientX: number) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || points.length === 0) return;
    const px = clientX - box.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.time) - px) < Math.abs(x(points[best].time) - px)) best = i;
    });
    setActive(best);
  }

  const shown = active !== null ? points[active] : null;

  return (
    <Frame
      label={label}
      table={
        <tbody>
          {points.map((p) => <tr key={p.key}><th>{p.caption}</th><td>{p.valueLabel}</td></tr>)}
        </tbody>
      }
    >
      <div
        ref={ref}
        className="relative touch-pan-y"
        style={{ height }}
        onPointerMove={(e) => nearest(e.clientX)}
        onPointerDown={(e) => nearest(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible" aria-hidden>
            <text x={0} y={10} className="fill-muted text-[11px]">{unit}</text>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">{tickText(t)}</text>
              </g>
            ))}
            {axisTimes.map((t, i) => (
              <text
                key={t}
                x={x(t)}
                y={height - 4}
                textAnchor={axisTimes.length > 1 && i === 0 ? "start" : axisTimes.length > 1 && i === axisTimes.length - 1 ? "end" : "middle"}
                className="fill-muted text-[11px]"
              >
                {formatTick(t)}
              </text>
            ))}
            {shown && <line x1={x(shown.time)} x2={x(shown.time)} y1={pad.top} y2={y(0)} stroke="var(--muted)" strokeWidth={1} />}
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle
                key={p.key}
                cx={x(p.time)}
                cy={y(p.value)}
                r={active === i ? 5.5 : 4}
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
          </svg>
        )}
        {shown && <Tooltip x={x(shown.time)} width={width} value={shown.valueLabel} caption={shown.caption} />}
      </div>
    </Frame>
  );
}
