"use client";

import { Sparkles, Lock, Check } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { characterLevel } from "@/lib/leveling";
import { deriveClass } from "@/lib/classes";
import { PERKS, perkCost } from "@/lib/perks";
import { RARITY_COLOR, RARITY_ORDER } from "@/lib/loot";
import { Icon } from "@/components/Icon";
import { Card, CardTitle, HydrationGate, PageHeader } from "@/components/ui";

export default function SkillsPage() {
  const { state, hydrated, buyPerk } = useGameState();
  const cl = characterLevel(state.stats);
  const klass = deriveClass(state.stats, cl);

  const inventory = [...state.inventory].sort(
    (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
  );

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Skills & Loot"
        subtitle="Spend skill points on perks and show off your collection."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 shadow-glow">
            <Sparkles size={16} className="text-accent" />
            <span className="tabular text-sm font-semibold text-slate-100">{state.skillPoints}</span>
            <span className="text-xs text-slate-400">skill points</span>
          </div>
        }
      />

      {/* Class card */}
      <Card className="mb-5 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-glow">
          <Icon name={klass.icon} size={26} />
        </span>
        <div>
          <p className="font-pixel text-[10px] text-accent">YOUR CLASS</p>
          <h2 className="text-xl font-bold text-slate-100">
            {klass.title} {klass.name}
          </h2>
          <p className="text-sm text-slate-400">
            Class is derived from your strongest stat and evolves as you grow.
          </p>
        </div>
      </Card>

      {/* Skill tree */}
      <Card className="mb-5">
        <CardTitle>Skill Tree</CardTitle>
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
                        <span
                          key={i}
                          className={`h-1.5 w-3 rounded-full ${i < rank ? "bg-accent" : "bg-line"}`}
                        />
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

      {/* Inventory */}
      <Card>
        <CardTitle>Loot ({inventory.length})</CardTitle>
        {inventory.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No loot yet. Complete quests and defeat bosses to find treasure.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {inventory.map((item) => {
              const color = RARITY_COLOR[item.rarity];
              return (
                <div
                  key={item.id}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-bg-soft/50 p-4 text-center"
                  style={{ borderColor: `${color}55` }}
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    <Icon name={item.icon} size={24} />
                  </span>
                  <p className="text-sm font-medium text-slate-100">{item.name}</p>
                  <p className="text-[11px] capitalize" style={{ color }}>
                    {item.rarity}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </HydrationGate>
  );
}
