import type { LootItem, Rarity } from "./types";

// ─── Loot table ───────────────────────────────────────────────────────────────
// Cosmetic collectibles dropped by quests and bosses. Purely for fun/collection.

const TABLE: Record<Rarity, { name: string; icon: string }[]> = {
  common: [
    { name: "Copper Coin", icon: "Coins" },
    { name: "Worn Charm", icon: "Shield" },
    { name: "Traveler's Feather", icon: "Feather" },
  ],
  rare: [
    { name: "Silver Sigil", icon: "Medal" },
    { name: "Focus Crystal", icon: "Gem" },
    { name: "Explorer's Map", icon: "Map" },
  ],
  epic: [
    { name: "Enchanted Blade", icon: "Swords" },
    { name: "Arcane Tome", icon: "BookOpen" },
    { name: "Phoenix Feather", icon: "Flame" },
  ],
  legendary: [
    { name: "Crown of Focus", icon: "Crown" },
    { name: "Dragon's Heart", icon: "Heart" },
    { name: "Starforged Relic", icon: "Sparkles" },
  ],
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#94a3b8",
  rare: "#38bdf8",
  epic: "#a78bfa",
  legendary: "#fbbf24",
};

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

function genId(): string {
  return `loot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeItem(rarity: Rarity): LootItem {
  const def = pick(TABLE[rarity]);
  return { id: genId(), name: def.name, rarity, icon: def.icon, acquiredAt: new Date().toISOString() };
}

/** Roll a rarity with luck shifting weight toward the higher tiers. */
function rollRarity(luck: number): Rarity {
  const r = Math.random();
  // Base cumulative thresholds, nudged by luck (0..~0.24).
  const legendary = 0.02 + luck * 0.15;
  const epic = 0.1 + luck * 0.4;
  const rare = 0.3 + luck * 0.6;
  if (r < legendary) return "legendary";
  if (r < epic) return "epic";
  if (r < rare) return "rare";
  return "common";
}

/**
 * Maybe drop loot from a normal quest completion.
 * @param dropChance base probability (e.g. 0.18) before luck.
 * @param luck additive loot chance + rarity luck from perks.
 */
export function rollQuestLoot(dropChance: number, luck: number): LootItem | null {
  if (Math.random() > dropChance + luck) return null;
  return makeItem(rollRarity(luck));
}

/** Bosses always drop something good (rare or better). */
export function rollBossLoot(luck: number): LootItem {
  const rarity = rollRarity(0.5 + luck);
  return makeItem(rarity === "common" ? "rare" : rarity);
}
