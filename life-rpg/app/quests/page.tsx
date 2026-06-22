"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Check,
  Trash2,
  RotateCcw,
  Repeat,
  Calendar,
  CalendarClock,
  Flame,
  Skull,
  Square,
  CheckSquare,
  Sparkles,
  Dices,
} from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { localDay } from "@/lib/dates";
import { FocusTimer } from "@/components/FocusTimer";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";
import type { Quest, StatKey } from "@/lib/types";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dueToday(q: Quest): boolean {
  if (q.days && q.days.length) return q.days.includes(new Date().getDay());
  return true;
}

function QuestRow({
  quest,
  statLabel,
  color,
  onComplete,
  onRemove,
  onUndo,
  onToggleSub,
}: {
  quest: Quest;
  statLabel: string;
  color: string;
  onComplete?: () => void;
  onRemove?: () => void;
  onUndo?: () => void;
  onToggleSub?: (subId: string) => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-lg border border-line/70 bg-bg-soft/60 px-3 py-2.5"
    >
      <div className="flex items-center gap-3">
        {onComplete ? (
          <button
            onClick={onComplete}
            aria-label={`Complete ${quest.title}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-transparent transition-colors hover:text-accent"
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
            {quest.sideQuest && <Dices size={12} className="mr-1 inline text-accent" />}
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
            {quest.days && quest.days.length > 0 && (
              <span className="flex items-center gap-0.5">
                <CalendarClock size={10} /> {quest.days.map((d) => DOW[d]).join("")}
              </span>
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
      </div>

      {/* Subtasks checklist */}
      {quest.subtasks && quest.subtasks.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 pl-9">
          {quest.subtasks.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => onToggleSub?.(s.id)}
                disabled={!onToggleSub}
                className="flex items-center gap-2 text-xs text-slate-400 disabled:cursor-default"
              >
                {s.done ? (
                  <CheckSquare size={13} className="text-accent" />
                ) : (
                  <Square size={13} className="text-slate-600" />
                )}
                <span className={s.done ? "text-slate-600 line-through" : ""}>{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.li>
  );
}

interface Suggestion {
  title: string;
  stat: string;
  xp: number;
}

export default function QuestsPage() {
  const { state, hydrated, addQuest, completeQuest, removeQuest, uncompleteQuest, toggleSubtask } =
    useGameState();

  const statList = Object.values(state.stats);
  const [title, setTitle] = useState("");
  const [stat, setStat] = useState<StatKey>(statList[0]?.key ?? "body");
  const [xp, setXp] = useState(30);
  const [daily, setDaily] = useState(false);
  const [negative, setNegative] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [subtasksRaw, setSubtasksRaw] = useState("");

  // AI suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState<string | null>(null);

  const today = localDay();
  const active = state.quests.filter((q) => !q.done && dueToday(q));
  const doneToday = state.quests.filter((q) => q.done && q.completedAt?.startsWith(today));

  const label = (key: StatKey) => state.stats[key]?.label ?? key;
  const color = (key: StatKey) => state.stats[key]?.color ?? statColor(key);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const subtasks = subtasksRaw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    addQuest({
      title,
      stat,
      xp,
      daily: daily && days.length === 0,
      negative,
      days: days.length ? days : undefined,
      subtasks,
    });
    setTitle("");
    setXp(30);
    setDaily(false);
    setNegative(false);
    setDays([]);
    setSubtasksRaw("");
  };

  const runSuggest = async () => {
    setSuggestLoading(true);
    setSuggestMsg(null);
    setSuggestions([]);
    const weakest = statList.length
      ? [...statList].sort((a, b) => a.level - b.level || a.xp - b.xp)[0].label
      : undefined;
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stats: statList.map((s) => ({ label: s.label, level: s.level })),
          weakest,
        }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.quests)) setSuggestions(json.quests);
      else setSuggestMsg(json.message ?? "Couldn't get suggestions.");
    } catch {
      setSuggestMsg("Network error.");
    } finally {
      setSuggestLoading(false);
    }
  };

  const addSuggestion = (s: Suggestion, idx: number) => {
    const match =
      statList.find((st) => st.key === s.stat.toLowerCase()) ??
      statList.find((st) => st.label.toLowerCase() === s.stat.toLowerCase());
    addQuest({
      title: s.title,
      stat: match?.key ?? statList[0]?.key ?? "body",
      xp: Math.max(5, Math.round(s.xp || 25)),
    });
    setSuggestions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader title="Quests" subtitle="Log actions to earn XP and level up your stats." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Add quest + focus timer + AI */}
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

              {/* Scheduled days */}
              <div>
                <p className="mb-1.5 text-xs text-slate-500">Schedule on specific days (optional)</p>
                <div className="flex gap-1">
                  {DOW.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      title={DOW_FULL[i]}
                      className={`h-8 flex-1 rounded-md text-xs font-medium ${
                        days.includes(i)
                          ? "bg-accent/20 text-accent"
                          : "bg-bg-soft text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <input
                value={subtasksRaw}
                onChange={(e) => setSubtasksRaw(e.target.value)}
                placeholder="Subtasks, comma-separated (optional)"
                className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
              />

              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={daily}
                    onChange={(e) => setDaily(e.target.checked)}
                    disabled={days.length > 0}
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

          <Card>
            <CardTitle>AI Quest Ideas</CardTitle>
            <button
              onClick={runSuggest}
              disabled={suggestLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-50"
            >
              <Sparkles size={15} />
              {suggestLoading ? "Thinking…" : "Suggest quests"}
            </button>
            {suggestMsg && <p className="mt-3 text-xs text-slate-500">{suggestMsg}</p>}
            {suggestions.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-line/70 bg-bg-soft/60 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-slate-100">{s.title}</p>
                      <p className="text-[10px] text-slate-500">{s.stat} · +{s.xp} XP</p>
                    </div>
                    <button
                      onClick={() => addSuggestion(s, i)}
                      className="shrink-0 rounded-md bg-accent/90 px-2 py-1 text-xs font-semibold text-bg hover:bg-accent"
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Today / active */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardTitle>Today &amp; Active ({active.length})</CardTitle>
            {active.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Nothing due. Add a quest or accept the daily side quest on the dashboard.
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
                      onToggleSub={(subId) => toggleSubtask(q.id, subId)}
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
