import type { Combo } from "./types";
import { perkComboCapBonus } from "./perks";

// Completing quests close together builds a momentum multiplier.
export const COMBO_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/** Is the combo still "live" (last completion within the window)? */
export function comboActive(combo: Combo, now: number = Date.now()): boolean {
  if (combo.count <= 0 || !combo.lastAt) return false;
  return now - new Date(combo.lastAt).getTime() <= COMBO_WINDOW_MS;
}

/** Multiplier (≥1) for a given combo count, including the Combo Master perk. */
export function comboMultiplier(count: number, perks: Record<string, number>): number {
  if (count <= 1) return 1;
  const cap = 0.5 + perkComboCapBonus(perks);
  return 1 + Math.min(0.1 * (count - 1), cap);
}

/** The combo as it stands *now* (expired combos read as 0). */
export function currentCombo(
  combo: Combo,
  perks: Record<string, number>,
  now: number = Date.now(),
): { count: number; mult: number; active: boolean } {
  const active = comboActive(combo, now);
  const count = active ? combo.count : 0;
  return { count, mult: comboMultiplier(count, perks), active };
}
