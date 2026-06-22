import type { LootItem, Rarity } from "./types";

// ─── Equippable gear ──────────────────────────────────────────────────────────
// Equip up to 3 loot items; each grants an all-stat XP bonus by rarity.

export const MAX_EQUIPPED = 3;

const GEAR_BONUS: Record<Rarity, number> = {
  common: 0.02,
  rare: 0.04,
  epic: 0.07,
  legendary: 0.12,
};

export function gearBonusFor(rarity: Rarity): number {
  return GEAR_BONUS[rarity];
}

/** Combined XP multiplier (≥1) from currently equipped gear. */
export function gearMultiplier(equipped: string[], inventory: LootItem[]): number {
  let mult = 1;
  for (const id of equipped) {
    const item = inventory.find((i) => i.id === id);
    if (item) mult += GEAR_BONUS[item.rarity];
  }
  return mult;
}

const COLLECTION_TIERS = [
  { at: 5, bonus: 0.02 },
  { at: 10, bonus: 0.04 },
  { at: 20, bonus: 0.06 },
  { at: 40, bonus: 0.1 },
];

/** Passive all-stat bonus for the size of your loot collection. */
export function collectionBonus(inventory: LootItem[]): {
  mult: number;
  bonus: number;
  next: number | null;
} {
  const n = inventory.length;
  let bonus = 0;
  for (const t of COLLECTION_TIERS) if (n >= t.at) bonus = t.bonus;
  const upcoming = COLLECTION_TIERS.find((t) => n < t.at);
  return { mult: 1 + bonus, bonus, next: upcoming ? upcoming.at : null };
}
