import {
  Activity, ArrowUpRight, BicepsFlexed, Dumbbell, Flame, Footprints, Layers, RotateCcw, Shapes, Zap, type LucideIcon,
} from "lucide-react";
import type { MacroPhase, Route } from "@/lib/program";

// Icon mappings used throughout the app.
export const routeIcon: Record<Route, LucideIcon> = {
  balanced: Shapes,
  strength: Dumbbell,
  muscle: BicepsFlexed,
  lean: Flame,
};

export const macroIcon: Record<MacroPhase, LucideIcon> = {
  rebuild: ArrowUpRight,
  build: Layers,
  strength: Zap,
  athletic: Activity,
};

export const levelIcon: Record<number, LucideIcon> = {
  [-2]: Footprints,
  [-1]: RotateCcw,
  0: Dumbbell,
  1: Flame,
};
