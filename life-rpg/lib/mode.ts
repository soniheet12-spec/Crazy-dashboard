// ─── Difficulty modes ─────────────────────────────────────────────────────────
// The whole "strict game" layer is driven by this table. Casual = the original
// upside-only behaviour; the higher tiers add real consequences.

import type { GameMode, GameState } from "./types";

export interface ModeRules {
  label: string;
  blurb: string;
  /** HP fully restores each morning (no decay of health). */
  autoHeal: boolean;
  /** HP lost per mandatory daily you skipped, applied at the day boundary. */
  dailyDamage: number;
  /** Fraction of a stat's XP lost per fully-idle day (rust). 0 = off. */
  decayPerDay: number;
  /** Minimum XP you must earn per day before a fine. 0 = off. */
  quota: number;
  /** Coins fined when the daily quota is missed (debt allowed). */
  quotaFine: number;
  /** Streak freezes can bridge a missed day. */
  allowFreeze: boolean;
  /** Completions can be undone. */
  allowUndo: boolean;
  /** Debuffs (Exhausted / Cursed / Poisoned) are active. */
  debuffs: boolean;
  /** HP lost when a boss blows its deadline (enrage). */
  bossEnrageDamage: number;
  /** Death wipes the character (roguelike) instead of a soft penalty. */
  permadeath: boolean;
  /** Fraction of every stat's XP burned on a soft death. */
  deathXpLoss: number;
  /** Lock down sample-data / import so a real run stays legit. */
  honorLock: boolean;
}

export const GAME_MODES: GameMode[] = ["casual", "normal", "hardcore", "nightmare"];

export const MODES: Record<GameMode, ModeRules> = {
  casual: {
    label: "Casual",
    blurb: "No penalties. HP heals each day, streaks forgive misses, nothing decays.",
    autoHeal: true,
    dailyDamage: 0,
    decayPerDay: 0,
    quota: 0,
    quotaFine: 0,
    allowFreeze: true,
    allowUndo: true,
    debuffs: false,
    bossEnrageDamage: 0,
    permadeath: false,
    deathXpLoss: 0,
    honorLock: false,
  },
  normal: {
    label: "Normal",
    blurb: "Light stakes. Skipped obligations sting and debuffs apply, but HP still heals and you can't die.",
    autoHeal: true,
    dailyDamage: 6,
    decayPerDay: 0,
    quota: 0,
    quotaFine: 0,
    allowFreeze: true,
    allowUndo: true,
    debuffs: true,
    bossEnrageDamage: 10,
    permadeath: false,
    deathXpLoss: 0,
    honorLock: false,
  },
  hardcore: {
    label: "Hardcore",
    blurb: "Real consequences. No daily heal, stats rust, a daily XP quota, no freezes or take-backs. Hit 0 HP and you lose levels.",
    autoHeal: false,
    dailyDamage: 15,
    decayPerDay: 0.03,
    quota: 50,
    quotaFine: 25,
    allowFreeze: false,
    allowUndo: false,
    debuffs: true,
    bossEnrageDamage: 25,
    permadeath: false,
    deathXpLoss: 0.2,
    honorLock: true,
  },
  nightmare: {
    label: "Nightmare",
    blurb: "Permadeath. Everything in Hardcore, bigger — and dying wipes the character to your legacy. No mercy.",
    autoHeal: false,
    dailyDamage: 25,
    decayPerDay: 0.05,
    quota: 100,
    quotaFine: 50,
    allowFreeze: false,
    allowUndo: false,
    debuffs: true,
    bossEnrageDamage: 40,
    permadeath: true,
    deathXpLoss: 1,
    honorLock: true,
  },
};

/** Rules for the current save (defaults to Casual for old saves). */
export function rules(state: GameState): ModeRules {
  return MODES[state.settings.mode ?? "casual"];
}
