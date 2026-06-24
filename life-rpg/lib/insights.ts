import type { GameState, Stat, XpHistoryPoint } from "./types";
import { totalXp } from "./leveling";
import { localDay, addDays, shortLabel, dayDiff } from "./dates";

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

// ─── XP forecast ──────────────────────────────────────────────────────────────

export interface ForecastPoint {
  label: string;
  actual: number | null; // cumulative XP up to this past day
  projected: number | null; // projected cumulative XP for future days
}

/**
 * Cumulative-XP series for the past `pastDays`, continued with a dashed
 * projection for `futureDays` based on the last week's average daily pace.
 */
export function computeForecast(
  history: XpHistoryPoint[],
  pastDays = 14,
  futureDays = 7,
): { series: ForecastPoint[]; dailyAvg: number; projectedTotal: number } {
  const byDate = new Map(history.map((h) => [h.date, h.xp]));
  const today = localDay();
  const start = addDays(today, -(pastDays - 1));

  let recentSum = 0;
  for (let i = 0; i < 7; i++) recentSum += byDate.get(addDays(today, -i)) ?? 0;
  const dailyAvg = Math.round(recentSum / 7);

  const series: ForecastPoint[] = [];
  let cum = 0;
  for (let i = 0; i < pastDays; i++) {
    const date = addDays(start, i);
    cum += byDate.get(date) ?? 0;
    // Seed the projected line at the junction so the dashed segment connects.
    series.push({ label: shortLabel(date), actual: cum, projected: i === pastDays - 1 ? cum : null });
  }
  for (let j = 1; j <= futureDays; j++) {
    series.push({ label: shortLabel(addDays(today, j)), actual: null, projected: cum + dailyAvg * j });
  }
  return { series, dailyAvg, projectedTotal: dailyAvg * futureDays };
}

// ─── Stat balance ─────────────────────────────────────────────────────────────

export interface StatBalance extends Stat {
  share: number; // 0–1 portion of total XP
  recency: number | null; // days since last trained (null = never)
  neglected: boolean;
}

/** Per-stat balance, sorted weakest-first, flagging neglected stats. */
export function statBalance(state: GameState, neglectDays = 3): StatBalance[] {
  const stats = Object.values(state.stats);
  const total = stats.reduce((s, x) => s + x.xp, 0) || 1;
  const day = localDay();
  return stats
    .map((s) => {
      const recency = s.lastTrained ? dayDiff(s.lastTrained, day) : null;
      return {
        ...s,
        share: s.xp / total,
        recency,
        neglected: recency === null || recency >= neglectDays,
      };
    })
    .sort((a, b) => a.level - b.level || a.xp - b.xp);
}

export function hourLabel(h: number): string {
  const ampm = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${ampm}`;
}
