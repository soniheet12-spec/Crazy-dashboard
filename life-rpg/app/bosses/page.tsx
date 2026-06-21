"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Trash2, Skull, Crown, TrendingUp } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { localDay, dayDiff } from "@/lib/dates";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";
import type { BossGoal, StatKey } from "@/lib/types";

/** Estimate days-to-defeat from progress made since the season started. */
function forecastDays(boss: BossGoal, seasonStartedAt: string): number | null {
  if (boss.progress <= 0) return null;
  const startDay = localDay(new Date(seasonStartedAt));
  const elapsed = Math.max(1, dayDiff(startDay, localDay()));
  const rate = boss.progress / elapsed; // progress per day
  if (rate <= 0) return null;
  return Math.max(1, Math.ceil((boss.target - boss.progress) / rate));
}

export default function BossesPage() {
  const { state, hydrated, addBoss, updateBossProgress, removeBoss } = useGameState();
  const statList = Object.values(state.stats);

  const [title, setTitle] = useState("");
  const [stat, setStat] = useState<StatKey>(statList[0]?.key ?? "body");
  const [target, setTarget] = useState(10);
  const [unit, setUnit] = useState("");
  const [steps, setSteps] = useState<Record<string, number>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addBoss({ title, stat, target, unit });
    setTitle("");
    setTarget(10);
    setUnit("");
  };

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader title="Boss Goals" subtitle="The big, season-defining objectives. Chip away at them." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardTitle>New Boss</CardTitle>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Raise Seed Round"
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
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                placeholder="Target"
                className="tabular w-28 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
                aria-label="Target"
              />
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unit (e.g. ₹Cr)"
                className="flex-1 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-accent/90 px-3 py-2.5 text-sm font-semibold text-bg hover:bg-accent"
            >
              <Plus size={16} /> Add Boss
            </button>
          </form>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          {state.bosses.length === 0 && (
            <Card>
              <p className="py-8 text-center text-sm text-slate-500">
                No boss goals yet. Define one to give your season a target.
              </p>
            </Card>
          )}

          <AnimatePresence initial={false}>
            {state.bosses.map((b) => {
              const pct = Math.min(100, Math.round((b.progress / b.target) * 100));
              const defeated = b.progress >= b.target;
              const color = state.stats[b.stat]?.color ?? statColor(b.stat);
              const step = steps[b.id] ?? Math.max(1, Math.round(b.target / 10));
              const eta = !defeated ? forecastDays(b, state.settings.seasonStartedAt) : null;
              return (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <Card className={defeated ? "shadow-glow-amber" : ""}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          {defeated ? <Crown size={18} /> : <Skull size={18} />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100">{b.title}</p>
                          <p className="text-[11px] uppercase tracking-wide" style={{ color }}>
                            {state.stats[b.stat]?.label ?? b.stat}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeBoss(b.id)}
                        aria-label="Delete boss"
                        className="text-slate-600 hover:text-body"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mb-2 flex items-end justify-between text-sm">
                      <span className="tabular text-slate-300">
                        {b.progress} / {b.target} {b.unit}
                      </span>
                      <span className="tabular text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-bg-soft">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>

                    {eta !== null && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <TrendingUp size={13} /> ~{eta} day{eta === 1 ? "" : "s"} to defeat at your current pace
                      </p>
                    )}

                    {!defeated && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => updateBossProgress(b.id, -step)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-slate-300 hover:border-accent"
                          aria-label="Decrease"
                        >
                          <Minus size={15} />
                        </button>
                        <input
                          type="number"
                          value={step}
                          onChange={(e) =>
                            setSteps((p) => ({ ...p, [b.id]: Number(e.target.value) }))
                          }
                          className="tabular w-20 rounded-lg border border-line bg-bg-soft px-2 py-1.5 text-center text-sm text-slate-100 outline-none focus:border-accent"
                          aria-label="Step size"
                        />
                        <button
                          onClick={() => updateBossProgress(b.id, step)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-slate-300 hover:border-accent"
                          aria-label="Increase"
                        >
                          <Plus size={15} />
                        </button>
                        <span className="ml-1 text-xs text-slate-500">adjust progress</span>
                      </div>
                    )}
                    {defeated && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber">
                        <Crown size={15} /> Boss defeated — goal complete!
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
