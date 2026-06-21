import type { GameSettings, Stat, StatKey } from "./types";

// ─── Leveling math ────────────────────────────────────────────────────────────
//
// The prompt defines `xpForLevel(n) = 100 * n^1.5` (rounded) and asks us to
// "compute current level from cumulative stat XP". We treat xpForLevel(n) as the
// *incremental* XP required to advance FROM level n TO level n+1. A stat starts
// at level 1 with 0 XP, and its cumulative XP determines its level.

/** Incremental XP needed to go from level `n` to level `n + 1`. */
export function xpForLevel(n: number): number {
  return Math.round(100 * Math.pow(n, 1.5));
}

/** Total cumulative XP required to reach (be at) level `level`. Level 1 = 0 XP. */
export function cumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let n = 1; n < level; n++) total += xpForLevel(n);
  return total;
}

/** Compute the level for a given cumulative XP total (minimum level 1). */
export function levelFromXp(xp: number): number {
  let level = 1;
  // Advance while we can afford the next level.
  while (xp >= cumulativeXpForLevel(level + 1)) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP accumulated within the current level. */
  xpIntoLevel: number;
  /** XP span of the current level (from this level to the next). */
  xpForThisLevel: number;
  /** 0..1 progress toward the next level. */
  pct: number;
  /** XP remaining until the next level. */
  toNext: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const base = cumulativeXpForLevel(level);
  const span = xpForLevel(level);
  const xpIntoLevel = xp - base;
  const pct = span > 0 ? Math.min(1, xpIntoLevel / span) : 0;
  return {
    level,
    xpIntoLevel,
    xpForThisLevel: span,
    pct,
    toNext: Math.max(0, span - xpIntoLevel),
  };
}

/** Character Level = floor(average of all stat levels). */
export function characterLevel(stats: Record<StatKey, Stat>): number {
  const levels = Object.values(stats).map((s) => s.level);
  if (levels.length === 0) return 1;
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  return Math.max(1, Math.floor(avg));
}

export function totalXp(stats: Record<StatKey, Stat>): number {
  return Object.values(stats).reduce((sum, s) => sum + s.xp, 0);
}

/** XP multiplier applied at log time based on the current streak length. */
export function streakMultiplier(
  currentStreak: number,
  settings: GameSettings,
): number {
  if (currentStreak >= 30) return settings.streak30Multiplier;
  if (currentStreak >= 7) return settings.streak7Multiplier;
  return 1;
}
