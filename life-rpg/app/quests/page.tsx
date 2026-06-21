"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, RotateCcw, Repeat, Calendar, Flame, Skull } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { localDay } from "@/lib/dates";
import { FocusTimer } from "@/components/FocusTimer";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";
import type { Quest, StatKey } from "@/lib/types";

function QuestRow({
  quest,
  statLabel,
  color,
  onComplete,
  onRemove,
  onUndo,
}: {
  quest: Quest;
  statLabel: string;
  color: string;
  onComplete?: () => void;
  onRemove?: () => void;
  onUndo?: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="flex items-center gap-3 rounded-lg border border-line/70 bg-bg-soft/60 px-3 py-2.5"
    >
      {onComplete ? (
        <button
          onClick={onComplete}
          aria-label={`Complete ${quest.title}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-transparent transition-colors hover:border-accent hover:text-accent"
          style={{ borderColor: color }}
        >
          <Check size={15} />
        </button>
      ) : (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: color }}
        >
          <Check size={15} className="text-bg" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${quest.done ? "text-slate-500 line-through" : "text-slate-100"}`}>
          {quest.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span style={{ color }}>{statLabel}</span>
          <span className="tabular">
            {quest.negative ? "−" : "+"}
            {quest.xp} XP
          </span>
          {quest.daily && (
            <span className="flex items-center gap-0.5"><Repeat size={10} /> daily</span>
          )}
          {quest.negative && (
            <span className="flex items-center gap-0.5 text-body"><Skull size={10} /> anti-habit</span>
          )}
          {quest.source === "calendar" && (
            <span className="flex items-center gap-0.5"><Calendar size={10} /> calendar</span>
          )}
          {quest.habitStreak && quest.habitStreak.best > 0 && (
            <span className="flex items-center gap-0.5 text-amber">
              <Flame size={10} /> {quest.habitStreak.current}
              <span className="text-slate-600">/{quest.habitStreak.best}</span>
            </span>
          )}
        </div>
      </div>

      {onUndo && (
        <button onClick={onUndo} aria-label="Undo" className="text-slate-600 hover:text-slate-300">
          <RotateCcw size={15} />
        </button>
      )}
      {onRemove && (
        <button onClick={onRemove} aria-label="Delete" className="text-slate-600 hover:text-body">
          <Trash2 size={15} />
        </button>
      )}
    </motion.li>
  );
}

export default function QuestsPage() {
  const { state, hydrated, addQuest, completeQuest, removeQuest, uncompleteQuest } =
    useGameState();

  const statList = Object.values(state.stats);
  const [title, setTitle] = useState("");
  const [stat, setStat] = useState<StatKey>(statList[0]?.key ?? "body");
  const [xp, setXp] = useState(30);
  const [daily, setDaily] = useState(false);
  const [negative, setNegative] = useState(false);

  const today = localDay();
  const active = state.quests.filter((q) => !q.done);
  const doneToday = state.quests.filter(
    (q) => q.done && q.completedAt?.startsWith(today),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addQuest({ title, stat, xp, daily, negative });
    setTitle("");
    setXp(30);
    setDaily(false);
    setNegative(false);
  };

  const label = (key: StatKey) => state.stats[key]?.label ?? key;
  const color = (key: StatKey) => state.stats[key]?.color ?? statColor(key);

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader title="Quests" subtitle="Log actions to earn XP and level up your stats." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Add quest + focus timer */}
        <div className="flex flex-col gap-5 lg:col-span-1">
        <Card>
          <CardTitle>New Quest</CardTitle>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 30-minute run"
              className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
            />
            <div className="flex gap-2">
              <select
                value={stat}
                onChange={(e) => setStat(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
              >
                {statList.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={xp}
                onChange={(e) => setXp(Number(e.target.value))}
                className="tabular w-24 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
                aria-label="XP reward"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={daily}
                  onChange={(e) => setDaily(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Repeats daily
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={negative}
                  onChange={(e) => setNegative(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Anti-habit (costs XP)
              </label>
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-accent/90 px-3 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-accent"
            >
              <Plus size={16} /> Add Quest
            </button>
          </form>
        </Card>
        <FocusTimer />
        </div>

        {/* Today / active */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardTitle>Today &amp; Active ({active.length})</CardTitle>
            {active.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No active quests. Add one to start earning XP.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {active.map((q) => (
                    <QuestRow
                      key={q.id}
                      quest={q}
                      statLabel={label(q.stat)}
                      color={color(q.stat)}
                      onComplete={() => completeQuest(q.id)}
                      onRemove={() => removeQuest(q.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>

          {doneToday.length > 0 && (
            <Card>
              <CardTitle>Completed Today ({doneToday.length})</CardTitle>
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {doneToday.map((q) => (
                    <QuestRow
                      key={q.id}
                      quest={q}
                      statLabel={label(q.stat)}
                      color={color(q.stat)}
                      onUndo={() => uncompleteQuest(q.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </Card>
          )}
        </div>
      </div>
    </HydrationGate>
  );
}
