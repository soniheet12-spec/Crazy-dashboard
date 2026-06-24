"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Trash2, Castle, Crown, X, Coins, Check } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { DUNGEON_PRESETS, dungeonPct, dungeonProgress, dungeonTotal } from "@/lib/dungeons";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";
import type { DungeonStage, StatKey } from "@/lib/types";

type DraftStage = { label: string; target: number; reward: number };

const emptyStage = (): DraftStage => ({ label: "", target: 1, reward: 30 });

export default function DungeonsPage() {
  const { state, hydrated, addDungeon, progressDungeon, removeDungeon } = useGameState();
  const statList = Object.values(state.stats);
  const dungeons = state.dungeons ?? [];

  const [name, setName] = useState("");
  const [stat, setStat] = useState<StatKey>(statList[0]?.key ?? "body");
  const [stages, setStages] = useState<DraftStage[]>([emptyStage(), emptyStage()]);
  const [steps, setSteps] = useState<Record<string, number>>({});

  const setStage = (i: number, patch: Partial<DraftStage>) =>
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStage = () => setStages((prev) => [...prev, emptyStage()]);
  const removeStage = (i: number) => setStages((prev) => prev.filter((_, idx) => idx !== i));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = stages.filter((s) => s.label.trim() && s.target > 0);
    if (!name.trim() || valid.length === 0) return;
    addDungeon({ name, stat, stages: valid as DungeonStage[] });
    setName("");
    setStages([emptyStage(), emptyStage()]);
  };

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Dungeons"
        subtitle="Multi-stage runs for big goals — clear each stage for milestone rewards."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* New dungeon */}
        <Card className="lg:col-span-1">
          <CardTitle>New Dungeon</CardTitle>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Couch to 5K"
              className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
            />
            <select
              value={stat}
              onChange={(e) => setStat(e.target.value)}
              className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            >
              {statList.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500">Stages</p>
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={s.label}
                    onChange={(e) => setStage(i, { label: e.target.value })}
                    placeholder={`Stage ${i + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-bg-soft px-2.5 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
                  />
                  <input
                    type="number"
                    min={1}
                    value={s.target}
                    onChange={(e) => setStage(i, { target: Number(e.target.value) })}
                    title="Target"
                    aria-label={`Stage ${i + 1} target`}
                    className="tabular w-12 rounded-lg border border-line bg-bg-soft px-2 py-1.5 text-center text-xs text-slate-100 outline-none focus:border-accent"
                  />
                  <span className="flex items-center gap-0.5 text-[10px] text-amber" title="Reward (coins + XP)">
                    <Coins size={10} />
                    <input
                      type="number"
                      min={0}
                      value={s.reward}
                      onChange={(e) => setStage(i, { reward: Number(e.target.value) })}
                      aria-label={`Stage ${i + 1} reward`}
                      className="tabular w-12 rounded-lg border border-line bg-bg-soft px-1.5 py-1.5 text-center text-xs text-slate-100 outline-none focus:border-accent"
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStage(i)}
                    disabled={stages.length <= 1}
                    aria-label="Remove stage"
                    className="text-slate-600 hover:text-body disabled:opacity-30"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addStage}
                className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-line py-1.5 text-xs text-slate-400 hover:border-accent hover:text-accent"
              >
                <Plus size={13} /> Add stage
              </button>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-accent/90 px-3 py-2.5 text-sm font-semibold text-bg hover:bg-accent"
            >
              <Castle size={16} /> Create Dungeon
            </button>
          </form>

          <div className="mt-4 border-t border-line/70 pt-4">
            <p className="mb-2 text-xs text-slate-500">Quick templates</p>
            <div className="flex flex-wrap gap-2">
              {DUNGEON_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() =>
                    addDungeon({
                      name: p.name,
                      stat: state.stats[p.stat] ? p.stat : statList[0]?.key ?? "body",
                      stages: p.stages,
                    })
                  }
                  className="rounded-full border border-line bg-bg-soft px-3 py-1.5 text-xs text-slate-200 hover:border-accent"
                >
                  + {p.name} ({p.stages.length})
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Active dungeons */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {dungeons.length === 0 && (
            <Card>
              <p className="py-8 text-center text-sm text-slate-500">
                No dungeons yet. Break a big goal into stages and start your run.
              </p>
            </Card>
          )}

          <AnimatePresence initial={false}>
            {dungeons.map((dg) => {
              const color = state.stats[dg.stat]?.color ?? statColor(dg.stat);
              const cleared = !!dg.clearedAt;
              const pct = dungeonPct(dg);
              const prog = dungeonProgress(dg);
              const total = dungeonTotal(dg);
              const cur = cleared ? undefined : dg.stages[dg.stageIndex];
              const step = steps[dg.id] ?? 1;
              return (
                <motion.div
                  key={dg.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <Card className={cleared ? "shadow-glow-amber" : ""}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          {cleared ? <Crown size={18} /> : <Castle size={18} />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100">{dg.name}</p>
                          <p className="text-[11px] uppercase tracking-wide" style={{ color }}>
                            {state.stats[dg.stat]?.label ?? dg.stat} ·{" "}
                            <span className="text-slate-500">
                              {Math.min(dg.stageIndex + (cleared ? 0 : 1), dg.stages.length)}/{dg.stages.length} stages
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDungeon(dg.id)}
                        aria-label="Delete dungeon"
                        className="text-slate-600 hover:text-body"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Overall progress */}
                    <div className="mb-1 flex items-end justify-between text-xs">
                      <span className="tabular text-slate-400">
                        {prog} / {total} overall
                      </span>
                      <span className="tabular text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-soft">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>

                    {/* Stage list */}
                    <ul className="mt-4 flex flex-col gap-2">
                      {dg.stages.map((s, i) => {
                        const done = cleared || i < dg.stageIndex;
                        const current = !cleared && i === dg.stageIndex;
                        const stagePct = current
                          ? Math.min(100, Math.round((dg.progress / s.target) * 100))
                          : done
                            ? 100
                            : 0;
                        return (
                          <li
                            key={i}
                            className={`rounded-lg border px-3 py-2 ${
                              current ? "border-accent/50 bg-bg-hover/40" : "border-line/60 bg-bg-soft/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                                    done
                                      ? "bg-wealth/20 text-wealth"
                                      : current
                                        ? "bg-accent/20 text-accent"
                                        : "bg-bg-soft text-slate-500"
                                  }`}
                                >
                                  {done ? <Check size={12} /> : i + 1}
                                </span>
                                <span
                                  className={`truncate text-sm ${
                                    done ? "text-slate-500 line-through" : "text-slate-100"
                                  }`}
                                >
                                  {s.label}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1 text-[10px] text-amber">
                                <Coins size={10} /> {s.reward}
                              </span>
                            </div>
                            {current && (
                              <>
                                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                  <span className="tabular">
                                    {dg.progress} / {s.target}
                                  </span>
                                  <span className="tabular">{stagePct}%</span>
                                </div>
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
                                  <div
                                    className="bar-fill h-full rounded-full bg-accent"
                                    style={{ width: `${stagePct}%` }}
                                  />
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => progressDungeon(dg.id, -step)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-slate-300 hover:border-accent"
                                    aria-label="Decrease"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <input
                                    type="number"
                                    value={step}
                                    onChange={(e) => setSteps((p) => ({ ...p, [dg.id]: Number(e.target.value) }))}
                                    className="tabular w-16 rounded-lg border border-line bg-bg-soft px-2 py-1 text-center text-sm text-slate-100 outline-none focus:border-accent"
                                    aria-label="Step size"
                                  />
                                  <button
                                    onClick={() => progressDungeon(dg.id, step)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-slate-300 hover:border-accent"
                                    aria-label="Increase"
                                  >
                                    <Plus size={14} />
                                  </button>
                                  <span className="ml-1 text-xs text-slate-500">log progress</span>
                                </div>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {cleared && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber">
                        <Crown size={15} /> Dungeon cleared on {dg.clearedAt}!
                      </p>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </HydrationGate>
  );
}
