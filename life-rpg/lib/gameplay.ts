import type { GameState } from "./types";
import type { Difficulty } from "./types";
import { localDay, addDays } from "./dates";
import { levelFromXp, characterLevel } from "./leveling";

// ─── HP ───────────────────────────────────────────────────────────────────────
export const MAX_HP = 100;

// ─── Difficulty ─────────────────────────────────────────────────────────────--
const DIFF_MULT: Record<Difficulty, number> = { easy: 0.7, normal: 1, hard: 1.4 };
export function difficultyMult(d?: Difficulty): number {
  return d ? DIFF_MULT[d] : 1;
}
export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

// ─── Challenges ─────────────────────────────────────────────────────────────--
export interface Challenge {
  label: string;
  target: number;
  reward: number; // coins
}
export const DAILY_CHALLENGE: Challenge = {
  label: "Complete 3 quests today",
  target: 3,
  reward: 60,
};
export const WEEKLY_CHALLENGE: Challenge = {
  label: "Earn 600 XP this week",
  target: 600,
  reward: 250,
};

export function weekKey(d: Date = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 1);
  const day = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return `${d.getFullYear()}-W${Math.floor(day / 7)}`;
}

export function dailyChallengeProgress(state: GameState): number {
  const today = localDay();
  return state.quests.filter(
    (q) => q.done && !q.negative && q.completedAt?.startsWith(today),
  ).length;
}

export function weeklyChallengeProgress(state: GameState): number {
  const today = localDay();
  const start = addDays(today, -6);
  return state.xpHistory
    .filter((p) => p.date >= start && p.date <= today)
    .reduce((s, p) => s + Math.max(0, p.xp), 0);
}

// ─── Goal projection ────────────────────────────────────────────────────────--
/** Project Character Level `days` out from the recent XP rate. */
export function projectCharacterLevel(
  state: GameState,
  days = 30,
): { projected: number; ratePerDay: number } {
  const today = localDay();
  const start = addDays(today, -13);
  const recent = state.xpHistory
    .filter((p) => p.date >= start && p.date <= today)
    .reduce((s, p) => s + Math.max(0, p.xp), 0);
  const ratePerDay = recent / 14;

  const stats = Object.values(state.stats);
  if (stats.length === 0) return { projected: 1, ratePerDay: Math.round(ratePerDay) };
  const perStatGain = (ratePerDay * days) / stats.length;
  const projectedLevels = stats.map((s) => levelFromXp(s.xp + perStatGain));
  const avg = projectedLevels.reduce((a, b) => a + b, 0) / projectedLevels.length;
  const projected = Math.max(characterLevel(state.stats), Math.floor(avg));
  return { projected, ratePerDay: Math.round(ratePerDay) };
}
