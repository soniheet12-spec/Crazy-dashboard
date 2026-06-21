import type { StatKey } from "./types";

// ─── Skill-tree perks ─────────────────────────────────────────────────────────
// Skill points are earned on stat level-ups and spent here. Effects are pure
// multipliers/bonuses read at XP-award time, so nothing here needs side effects.

export type PerkKind = "stat" | "all" | "combo" | "loot";

export interface Perk {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  kind: PerkKind;
  stat?: StatKey; // for kind === "stat"
  per: number; // effect magnitude per rank
  maxRank: number;
}

export const PERKS: Perk[] = [
  { id: "iron-body", name: "Iron Body", description: "+6% Body XP per rank.", icon: "Dumbbell", kind: "stat", stat: "body", per: 0.06, maxRank: 5 },
  { id: "focused-mind", name: "Focused Mind", description: "+6% Mind XP per rank.", icon: "Brain", kind: "stat", stat: "mind", per: 0.06, maxRank: 5 },
  { id: "tycoons-touch", name: "Tycoon's Touch", description: "+6% Wealth XP per rank.", icon: "Coins", kind: "stat", stat: "wealth", per: 0.06, maxRank: 5 },
  { id: "silver-tongue", name: "Silver Tongue", description: "+6% Social XP per rank.", icon: "MessagesSquare", kind: "stat", stat: "social", per: 0.06, maxRank: 5 },
  { id: "disciplinarian", name: "Disciplinarian", description: "+6% Discipline XP per rank.", icon: "ShieldCheck", kind: "stat", stat: "discipline", per: 0.06, maxRank: 5 },
  { id: "polymath", name: "Polymath", description: "+3% XP for every stat per rank.", icon: "Sparkles", kind: "all", per: 0.03, maxRank: 5 },
  { id: "combo-master", name: "Combo Master", description: "Raises your combo multiplier cap by +0.15 per rank.", icon: "Flame", kind: "combo", per: 0.15, maxRank: 3 },
  { id: "lucky-looter", name: "Lucky Looter", description: "+6% loot drop chance per rank.", icon: "Gem", kind: "loot", per: 0.06, maxRank: 4 },
];

const PERK_BY_ID = new Map(PERKS.map((p) => [p.id, p]));

/** Skill-point cost to buy the next rank (rank is 0-indexed current rank). */
export function perkCost(currentRank: number): number {
  return currentRank + 1; // 1, then 2, then 3, …
}

/** XP multiplier (≥1) from owned perks for a given stat. */
export function perkXpMultiplier(perks: Record<string, number>, statKey: StatKey): number {
  let mult = 1;
  for (const [id, rank] of Object.entries(perks)) {
    if (!rank) continue;
    const perk = PERK_BY_ID.get(id);
    if (!perk) continue;
    if (perk.kind === "all") mult += perk.per * rank;
    else if (perk.kind === "stat" && perk.stat === statKey) mult += perk.per * rank;
  }
  return mult;
}

export function perkComboCapBonus(perks: Record<string, number>): number {
  const rank = perks["combo-master"] ?? 0;
  return (PERK_BY_ID.get("combo-master")?.per ?? 0) * rank;
}

export function perkLootChanceBonus(perks: Record<string, number>): number {
  const rank = perks["lucky-looter"] ?? 0;
  return (PERK_BY_ID.get("lucky-looter")?.per ?? 0) * rank;
}
