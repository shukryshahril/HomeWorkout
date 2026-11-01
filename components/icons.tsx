// Small custom glyphs for things lucide has no icon for, drawn to match its 24px stroke style.

// Dial with its needle swept from far left (fraction 0) to far right (fraction 1), like SF Symbols' gauge.with.dots.needle.
export function GaugeIcon({ fraction, size = 24 }: { fraction: number; size?: number }) {
  const angle = Math.PI * (1 - fraction);
  const x = 12 + 6.5 * Math.cos(angle);
  const y = 15 - 6.5 * Math.sin(angle);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" aria-hidden>
      <path d="M3.5 18a9 9 0 1 1 17 0" />
      <path d={`M12 15L${x.toFixed(2)} ${y.toFixed(2)}`} strokeWidth={2.5} />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PullUpBar({ size = 24, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 4h18" />
      <path d="M8 4v3a4 4 0 0 0 8 0V4" />
      <circle cx="12" cy="13" r="2" />
      <path d="M12 15v6" />
    </svg>
  );
}
