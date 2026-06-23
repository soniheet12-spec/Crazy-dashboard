import type { GameState, Rarity } from "./types";
import { RARITY_ORDER } from "./loot";

// ─── Shop, potions, prestige ──────────────────────────────────────────────────

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  cost: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "streak-freeze",
    name: "Streak Freeze",
    description: "Protects your streak from one missed day.",
    icon: "Snowflake",
    cost: 80,
  },
  {
    id: "xp-potion",
    name: "XP Potion",
    description: "1.5× XP for the next 30 minutes.",
    icon: "FlaskConical",
    cost: 60,
  },
  {
    id: "mystery-box",
    name: "Mystery Box",
    description: "Contains a random piece of loot.",
    icon: "Gift",
    cost: 100,
  },
];

export const POTION_MULT = 1.5;
export const POTION_MINUTES = 30;

export function potionActive(state: GameState, now: number = Date.now()): boolean {
  return !!state.potionUntil && now < new Date(state.potionUntil).getTime();
}

export function potionMultiplier(state: GameState): number {
  return potionActive(state) ? POTION_MULT : 1;
}

export function prestigeMultiplier(prestige: number): number {
  return 1 + 0.02 * prestige;
}

/** Coins awarded for a base-XP amount. */
export function coinsForXp(baseXp: number): number {
  return Math.max(1, Math.round(baseXp / 5));
}

/** Coins paid when selling a loot item, by rarity. */
const SELL_VALUE: Record<Rarity, number> = {
  common: 10,
  rare: 30,
  epic: 75,
  legendary: 150,
};
export function lootSellValue(rarity: Rarity): number {
  return SELL_VALUE[rarity];
}

/** Next rarity up for crafting, or null if already top tier. */
export function nextRarity(r: Rarity): Rarity | null {
  const i = RARITY_ORDER.indexOf(r);
  return i >= 0 && i < RARITY_ORDER.length - 1 ? RARITY_ORDER[i + 1] : null;
}
