"use client";

import { useEffect, useRef } from "react";

// One-shot confetti burst drawn on a canvas; ignores touches and fades out after `duration` seconds.
export function Confetti({ count = 90, duration = 3.2 }: { count?: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const style = getComputedStyle(document.documentElement);
    // Accent twice, the second at the soft-accent opacity (custom properties with var() can't be read as colours).
    const palette = [["--accent", 1], ["--ink", 1], ["--rest", 1], ["--good", 1], ["--accent", 0.38]] as const;
    const colors = palette.map(([name, alpha]) => ({ color: style.getPropertyValue(name).trim(), alpha }));
    const random = (min: number, max: number) => min + Math.random() * (max - min);
    const pieces = Array.from({ length: count }, () => ({
      x: random(0.05, 0.95),
      delay: random(0, 0.6),
      speed: random(120, 320),
      drift: random(-60, 60),
      sway: random(3, 7),
      spin: random(-9, 9),
      w: random(6, 10),
      h: random(10, 16),
      ...colors[Math.floor(Math.random() * colors.length)],
      isCircle: Math.random() < 0.2,
    }));
    const start = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const ratio = devicePixelRatio || 1;
      const { clientWidth: width, clientHeight: height } = canvas;
      if (canvas.width !== width * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const t = (now - start) / 1000;
      const fade = Math.max(0, Math.min(1, (duration - t) / 0.8));
      for (const p of pieces) {
        const local = t - p.delay;
        if (local <= 0) continue;
        const y = -20 + p.speed * local + 260 * local * local;
        if (y > height + 20) continue;
        const x = p.x * width + p.drift * local + Math.sin(local * p.sway) * 18;
        context.save();
        context.translate(x, y);
        context.rotate(local * p.spin);
        context.globalAlpha = fade * p.alpha;
        context.fillStyle = p.color;
        if (p.isCircle) {
          context.beginPath();
          context.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        context.restore();
      }
      if (t < duration + 0.5) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [count, duration]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50 size-full" aria-hidden />;
}
