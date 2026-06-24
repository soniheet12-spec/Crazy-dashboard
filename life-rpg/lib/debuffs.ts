// ─── Status effects (debuffs) ─────────────────────────────────────────────────
// Derived from current state (no stored timers) so they self-clear the moment
// you fix the underlying problem — rest to cure Exhaustion, finish your
// obligations to lift the Curse, stay clean to shed the Poison.

import type { GameState } from "./types";
import { rules } from "./mode";
import { localDay } from "./dates";

export type DebuffKind = "exhausted" | "cursed" | "poisoned";

export interface Debuff {
  kind: DebuffKind;
  label: string;
  blurb: string;
  icon: string; // lucide-react icon name
}

/** XP multiplier applied while Exhausted. */
export const EXHAUSTED_MULT = 0.75;

/** Is a (daily/scheduled) quest due today? */
function dueToday(days?: number[]): boolean {
  if (days && days.length) return days.includes(new Date().getDay());
  return true;
}

/** True if any mandatory daily is still unfinished today. */
export function hasOpenObligation(state: GameState): boolean {
  return state.quests.some(
    (q) => q.mandatory && !q.negative && (q.daily || (q.days?.length ?? 0) > 0) && dueToday(q.days) && !q.done,
  );
}

/** The status effects currently afflicting the character. */
export function activeDebuffs(state: GameState): Debuff[] {
  if (!rules(state).debuffs) return [];
  const list: Debuff[] = [];

  if (state.hp < 50) {
    list.push({
      kind: "exhausted",
      label: "Exhausted",
      blurb: `Low HP — XP earnings cut to ${Math.round(EXHAUSTED_MULT * 100)}%. Rest to recover.`,
      icon: "Moon",
    });
  }

  if (hasOpenObligation(state)) {
    list.push({
      kind: "cursed",
      label: "Cursed",
      blurb: "An obligation is unfinished — no loot will drop until you clear it.",
      icon: "Skull",
    });
  }

  const today = localDay();
  if (state.quests.some((q) => q.negative && q.lastLoggedDay === today)) {
    list.push({
      kind: "poisoned",
      label: "Poisoned",
      blurb: "You logged an anti-habit today. Stay clean tomorrow to recover.",
      icon: "FlaskConical",
    });
  }

  return list;
}

export function isExhausted(state: GameState): boolean {
  return activeDebuffs(state).some((d) => d.kind === "exhausted");
}
export function isCursed(state: GameState): boolean {
  return activeDebuffs(state).some((d) => d.kind === "cursed");
}
