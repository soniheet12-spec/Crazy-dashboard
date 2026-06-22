import type { GameState } from "./types";
import { localDay } from "./dates";

// ─── Season pass ──────────────────────────────────────────────────────────────
// Tiered rewards based on XP earned since the season started.

export interface SeasonTier {
  name: string;
  xp: number;
  icon: string; // lucide-react icon name
}

export const SEASON_TIERS: SeasonTier[] = [
  { name: "Bronze", xp: 0, icon: "Shield" },
  { name: "Silver", xp: 500, icon: "Medal" },
  { name: "Gold", xp: 1500, icon: "Trophy" },
  { name: "Platinum", xp: 3500, icon: "Gem" },
  { name: "Diamond", xp: 7000, icon: "Sparkles" },
  { name: "Mythic", xp: 12000, icon: "Crown" },
];

/** Total XP earned this season (from the daily history). */
export function seasonXp(state: GameState): number {
  const start = localDay(new Date(state.settings.seasonStartedAt));
  return state.xpHistory
    .filter((p) => p.date >= start)
    .reduce((s, p) => s + Math.max(0, p.xp), 0);
}

export function seasonProgress(xp: number): {
  tier: SeasonTier;
  tierIndex: number;
  next: SeasonTier | null;
  pct: number;
} {
  let tierIndex = 0;
  for (let i = 0; i < SEASON_TIERS.length; i++) {
    if (xp >= SEASON_TIERS[i].xp) tierIndex = i;
  }
  const tier = SEASON_TIERS[tierIndex];
  const next = SEASON_TIERS[tierIndex + 1] ?? null;
  const pct = next ? Math.min(1, (xp - tier.xp) / (next.xp - tier.xp)) : 1;
  return { tier, tierIndex, next, pct };
}
