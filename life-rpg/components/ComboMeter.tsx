"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { currentCombo } from "@/lib/combo";

/** Shows the live momentum multiplier while a combo is active. */
export function ComboMeter() {
  const { state } = useGameState();
  const [, setTick] = useState(0);

  // Refresh periodically so the badge hides once the combo window lapses.
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(i);
  }, []);

  const c = currentCombo(state.combo, state.perks);
  if (!c.active || c.count < 2) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5">
      <Flame size={15} className="animate-pulse-glow text-amber" />
      <span className="tabular text-sm font-semibold text-amber">
        Combo ×{c.mult.toFixed(2)}
      </span>
      <span className="text-xs text-slate-400">{c.count} in a row</span>
    </div>
  );
}
