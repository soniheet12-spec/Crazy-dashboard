import type { GameState } from "./types";
import { totalXp } from "./leveling";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface Insights {
  byHour: number[]; // 24
  byDow: number[]; // 7
  totalQuests: number;
  totalXp: number;
  activeDays: number;
  loot: number;
  longestStreak: number;
  bestHour: number | null;
  bestDow: string | null;
}

/** Derive analytics from completion timestamps + history. */
export function computeInsights(state: GameState): Insights {
  const done = state.quests.filter((q) => q.done && q.completedAt && !q.negative);
  const byHour = new Array(24).fill(0);
  const byDow = new Array(7).fill(0);
  for (const q of done) {
    const d = new Date(q.completedAt as string);
    byHour[d.getHours()] += 1;
    byDow[d.getDay()] += 1;
  }
  const maxHour = Math.max(...byHour);
  const maxDow = Math.max(...byDow);
  return {
    byHour,
    byDow,
    totalQuests: done.length,
    totalXp: totalXp(state.stats),
    activeDays: state.xpHistory.filter((p) => p.xp > 0).length,
    loot: state.inventory.length,
    longestStreak: state.streak.longest,
    bestHour: maxHour > 0 ? byHour.indexOf(maxHour) : null,
    bestDow: maxDow > 0 ? DOW[byDow.indexOf(maxDow)] : null,
  };
}

export const DOW_LABELS = DOW;

export function hourLabel(h: number): string {
  const ampm = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${ampm}`;
}
