"use client";

import { useState } from "react";
import { Sparkles, Lock, Check, Shield, Coins, Hammer, Star, Swords, X } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { characterLevel } from "@/lib/leveling";
import { deriveClass } from "@/lib/classes";
import { PERKS, perkCost } from "@/lib/perks";
import { RARITY_COLOR, RARITY_ORDER } from "@/lib/loot";
import { collectionBonus, gearBonusFor, gearMultiplier, MAX_EQUIPPED } from "@/lib/gear";
import { seasonProgress, seasonXp } from "@/lib/season";
import { SHOP_ITEMS, potionActive, nextRarity, lootSellValue } from "@/lib/shop";
import { Icon } from "@/components/Icon";
import { Card, CardTitle, HydrationGate, PageHeader } from "@/components/ui";

export default function SkillsPage() {
  const {
    state,
    hydrated,
    buyPerk,
    equipItem,
    unequipItem,
    sellLoot,
    buyShopItem,
    craft,
    prestige,
    respecPerks,
    saveLoadout,
    applyLoadout,
    removeLoadout,
  } = useGameState();
  const cl = characterLevel(state.stats);
  const klass = deriveClass(state.stats, cl);
  const loadouts = state.loadouts ?? [];
  const [loName, setLoName] = useState("");

  const inventory = [...state.inventory].sort(
    (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
  );
  const coll = collectionBonus(state.inventory);
  const gMult = gearMultiplier(state.equipped, state.inventory);
  const totalGearPct = Math.round((gMult * coll.mult - 1) * 100);

  const sXp = seasonXp(state);
  const sp = seasonProgress(sXp);
  const atMaxTier = sp.next === null;
  const potionOn = potionActive(state);
  const craftable = RARITY_ORDER.filter(
    (r) => r !== "legendary" && state.inventory.filter((i) => i.rarity === r).length >= 3,
  );

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Skills & Loot"
        subtitle="Spend skill points, equip gear, and climb the season ranks."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 shadow-glow">
            <Sparkles size={16} className="text-accent" />
            <span className="tabular text-sm font-semibold text-slate-100">{state.skillPoints}</span>
            <span className="text-xs text-slate-400">skill points</span>
          </div>
        }
      />

      {/* Class + season */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-glow">
            <Icon name={klass.icon} size={26} />
          </span>
          <div>
            <p className="font-pixel text-[10px] text-accent">YOUR CLASS</p>
            <h2 className="text-xl font-bold text-slate-100">
              {klass.title} {klass.name}
            </h2>
            <p className="text-sm text-slate-400">Evolves with your strongest stat.</p>
          </div>
        </Card>

        <Card>
          <CardTitle>Season Pass</CardTitle>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber/15 text-amber">
              <Icon name={sp.tier.icon} size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-slate-100">{sp.tier.name}</p>
                <p className="tabular text-xs text-slate-400">
                  {sXp} XP{sp.next ? ` · next ${sp.next.name} @ ${sp.next.xp}` : " · max tier"}
                </p>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-bg-soft">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-dim to-amber"
                  style={{ width: `${Math.round(sp.pct * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Skill tree */}
      <Card className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <CardTitle>Skill Tree</CardTitle>
          <button
            onClick={respecPerks}
            className="rounded-md border border-line px-2.5 py-1 text-xs text-slate-300 hover:border-accent"
          >
            Respec · 50 coins
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERKS.map((perk) => {
            const rank = state.perks[perk.id] ?? 0;
            const maxed = rank >= perk.maxRank;
            const cost = perkCost(rank);
            const canBuy = !maxed && state.skillPoints >= cost;
            return (
              <div
                key={perk.id}
                className={`flex items-start gap-3 rounded-xl border bg-bg-soft/50 p-4 ${
                  rank > 0 ? "border-accent/30" : "border-line/70"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    rank > 0 ? "bg-accent/15 text-accent" : "bg-bg-soft text-slate-500"
                  }`}
                >
                  <Icon name={perk.icon} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-100">{perk.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: perk.maxRank }).map((_, i) => (
                        <span key={i} className={`h-1.5 w-3 rounded-full ${i < rank ? "bg-accent" : "bg-line"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{perk.description}</p>
                  <div className="mt-2">
                    {maxed ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-wealth">
                        <Check size={13} /> Maxed
                      </span>
                    ) : (
                      <button
                        onClick={() => buyPerk(perk.id)}
                        disabled={!canBuy}
                        className="flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-semibold text-bg hover:bg-accent disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-slate-500"
                      >
                        {canBuy ? null : <Lock size={12} />}
                        Rank {rank + 1} · {cost} SP
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Shop */}
      <Card className="mb-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Shop</CardTitle>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-amber">
              <Coins size={13} /> {state.coins} coins
            </span>
            <span>{state.streakFreezes} freeze{state.streakFreezes === 1 ? "" : "s"}</span>
            {potionOn && <span className="text-accent">Potion active</span>}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SHOP_ITEMS.map((item) => {
            const afford = state.coins >= item.cost;
            return (
              <div key={item.id} className="flex flex-col rounded-xl border border-line/70 bg-bg-soft/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber/15 text-amber">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <p className="font-semibold text-slate-100">{item.name}</p>
                </div>
                <p className="mb-3 flex-1 text-xs text-slate-400">{item.description}</p>
                <button
                  onClick={() => buyShopItem(item.id)}
                  disabled={!afford}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1.5 text-xs font-semibold text-bg hover:bg-accent disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-slate-500"
                >
                  <Coins size={13} /> {item.cost}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Prestige */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber/15 text-amber">
            <Star size={20} fill={state.prestige > 0 ? "#fbbf24" : "none"} />
          </span>
          <div>
            <p className="font-semibold text-slate-100">Prestige {state.prestige}</p>
            <p className="text-sm text-slate-400">
              {atMaxTier
                ? "Reset the season for a permanent +2% XP per prestige."
                : "Reach the Mythic season tier to unlock prestige."}
            </p>
          </div>
        </div>
        <button
          onClick={prestige}
          disabled={!atMaxTier}
          className="rounded-lg bg-amber/90 px-4 py-2 text-sm font-semibold text-bg hover:bg-amber disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-slate-500"
        >
          Prestige
        </button>
      </Card>

      {/* Loot & gear */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            <span className="flex items-center gap-2">
              <Shield size={13} /> Loot &amp; Gear ({inventory.length})
            </span>
          </CardTitle>
          <p className="text-xs text-slate-400">
            Equipped {state.equipped.length}/{MAX_EQUIPPED} ·{" "}
            <span className="text-accent">+{totalGearPct}% XP</span> from gear &amp; collection
          </p>
        </div>

        {/* Gear loadouts */}
        <div className="mb-4 rounded-lg border border-line/70 bg-bg-soft/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Swords size={13} /> Loadouts
            </span>
            {loadouts.map((lo) => (
              <span
                key={lo.id}
                className="flex items-center gap-1.5 rounded-full border border-line bg-bg-soft px-2.5 py-1 text-xs text-slate-200"
              >
                <button
                  onClick={() => applyLoadout(lo.id)}
                  className="hover:text-accent"
                  title={`Equip "${lo.name}"`}
                >
                  {lo.name} <span className="text-slate-500">({lo.items.length})</span>
                </button>
                <button
                  onClick={() => removeLoadout(lo.id)}
                  aria-label={`Delete ${lo.name}`}
                  className="text-slate-600 hover:text-body"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <input
                value={loName}
                onChange={(e) => setLoName(e.target.value)}
                placeholder="Save current set…"
                className="w-32 rounded-md border border-line bg-bg-soft px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
              />
              <button
                onClick={() => {
                  saveLoadout(loName);
                  setLoName("");
                }}
                disabled={state.equipped.length === 0}
                className="rounded-md bg-accent/90 px-2.5 py-1 text-xs font-semibold text-bg hover:bg-accent disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-slate-500"
              >
                Save
              </button>
            </div>
          </div>
          {loadouts.length === 0 && (
            <p className="mt-1.5 text-[11px] text-slate-500">
              Equip gear, then save it as a one-tap loadout for different focuses.
            </p>
          )}
        </div>

        {craftable.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-line/70 bg-bg-soft/40 p-3">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Hammer size={13} /> Craft
            </span>
            {craftable.map((r) => (
              <button
                key={r}
                onClick={() => craft(r)}
                className="rounded-md border border-line px-2 py-1 text-xs capitalize text-slate-200 hover:border-accent"
              >
                3× {r} → {nextRarity(r)}
              </button>
            ))}
          </div>
        )}

        {inventory.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No loot yet. Complete quests and defeat bosses to find treasure.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {inventory.map((item) => {
              const color = RARITY_COLOR[item.rarity];
              const isEquipped = state.equipped.includes(item.id);
              const slotsFull = state.equipped.length >= MAX_EQUIPPED;
              return (
                <div
                  key={item.id}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-bg-soft/50 p-4 text-center"
                  style={{ borderColor: isEquipped ? color : `${color}55` }}
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    <Icon name={item.icon} size={24} />
                  </span>
                  <p className="text-sm font-medium text-slate-100">{item.name}</p>
                  <p className="text-[11px] capitalize" style={{ color }}>
                    {item.rarity} · +{Math.round(gearBonusFor(item.rarity) * 100)}%
                  </p>
                  <div className="flex w-full gap-1.5">
                    {isEquipped ? (
                      <button
                        onClick={() => unequipItem(item.id)}
                        className="flex-1 rounded-md border border-line px-2 py-1 text-xs text-slate-300 hover:border-body hover:text-body"
                      >
                        Unequip
                      </button>
                    ) : (
                      <button
                        onClick={() => equipItem(item.id)}
                        disabled={slotsFull}
                        className="flex-1 rounded-md bg-accent/90 px-2 py-1 text-xs font-semibold text-bg hover:bg-accent disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-slate-500"
                      >
                        {slotsFull ? "Slots full" : "Equip"}
                      </button>
                    )}
                    <button
                      onClick={() => sellLoot(item.id)}
                      title={`Sell for ${lootSellValue(item.rarity)} coins`}
                      aria-label={`Sell ${item.name}`}
                      className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-amber hover:border-amber"
                    >
                      <Coins size={12} /> {lootSellValue(item.rarity)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </HydrationGate>
  );
}
