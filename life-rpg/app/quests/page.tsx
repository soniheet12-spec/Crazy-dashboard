"use client";

import { useRef, useState } from "react";
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
  Wand2,
  Star,
  Search,
  X,
  Mic,
  Coins,
  AlertTriangle,
  Pencil,
  ListChecks,
} from "lucide-react";
import { useGameState, type QuestEdit } from "@/lib/gameState";
import { suggestStat } from "@/lib/calendarMapping";
import { rules } from "@/lib/mode";
import { DIFFICULTIES } from "@/lib/gameplay";
import { ROUTINES } from "@/lib/presets";
import { localDay, dayDiff } from "@/lib/dates";
import { FocusTimer } from "@/components/FocusTimer";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";
import type { Difficulty, Quest, StatKey } from "@/lib/types";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Minimal, self-contained typings for the Web Speech API (not in the TS DOM lib).
interface VoiceResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface VoiceRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: VoiceResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

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
  onFavorite,
  onEdit,
  selectMode,
  selected,
  onToggleSelect,
}: {
  quest: Quest;
  statLabel: string;
  color: string;
  onComplete?: () => void;
  onRemove?: () => void;
  onUndo?: () => void;
  onToggleSub?: (subId: string) => void;
  onFavorite?: () => void;
  onEdit?: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const daysClean =
    quest.negative && quest.lastLoggedDay ? dayDiff(quest.lastLoggedDay, localDay()) : null;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        selected ? "border-accent/60 bg-accent/10" : "border-line/70 bg-bg-soft/60"
      }`}
    >
      <div className="flex items-center gap-3">
        {selectMode ? (
          <button
            onClick={onToggleSelect}
            aria-label={selected ? `Deselect ${quest.title}` : `Select ${quest.title}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center"
          >
            {selected ? (
              <CheckSquare size={18} className="text-accent" />
            ) : (
              <Square size={18} className="text-slate-500" />
            )}
          </button>
        ) : onComplete ? (
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
            {daysClean !== null && (
              <span className="text-wealth">{daysClean}d clean</span>
            )}
            {quest.difficulty && quest.difficulty !== "normal" && (
              <span className="capitalize text-slate-400">{quest.difficulty}</span>
            )}
            {quest.wager ? (
              <span className="flex items-center gap-0.5 text-amber">
                <Coins size={10} /> {quest.wager} staked
              </span>
            ) : null}
            {quest.mandatory ? (
              <span className="flex items-center gap-0.5 text-body">
                <AlertTriangle size={10} /> required
              </span>
            ) : null}
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

        {onEdit && !selectMode && (
          <button onClick={onEdit} aria-label="Edit quest" className="text-slate-600 hover:text-accent">
            <Pencil size={15} />
          </button>
        )}
        {onFavorite && !selectMode && (
          <button onClick={onFavorite} aria-label="Save as template" className="text-slate-600 hover:text-amber">
            <Star size={15} />
          </button>
        )}
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

/** Inline editor shown in place of a quest row when editing. */
function EditQuestForm({
  quest,
  statList,
  onSave,
  onCancel,
}: {
  quest: Quest;
  statList: { key: string; label: string }[];
  onSave: (patch: QuestEdit) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(quest.title);
  const [stat, setStat] = useState<string>(quest.stat);
  const [xp, setXp] = useState(quest.xp);
  const [days, setDays] = useState<number[]>(quest.days ?? []);
  const [daily, setDaily] = useState(!!quest.daily);
  const [difficulty, setDifficulty] = useState<Difficulty>(quest.difficulty ?? "normal");
  const [negative, setNegative] = useState(!!quest.negative);
  const [mandatory, setMandatory] = useState(!!quest.mandatory);

  const toggleDay = (d: number) =>
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title,
      stat,
      xp,
      days,
      daily: daily && days.length === 0,
      negative,
      mandatory: mandatory && !negative,
      difficulty,
    });
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-lg border border-accent/50 bg-bg-hover/40 px-3 py-3"
    >
      <div className="flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
          aria-label="Quest title"
        />
        <div className="flex gap-2">
          <select
            value={stat}
            onChange={(e) => setStat(e.target.value)}
            className="flex-1 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            aria-label="Stat"
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
            className="tabular w-20 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            aria-label="XP reward"
          />
        </div>

        <div className="flex gap-1">
          {DOW.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              title={DOW_FULL[i]}
              className={`h-8 flex-1 rounded-md text-xs font-medium ${
                days.includes(i) ? "bg-accent/20 text-accent" : "bg-bg-soft text-slate-500 hover:text-slate-300"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`h-8 flex-1 rounded-md text-xs font-medium capitalize ${
                difficulty === d ? "bg-accent/20 text-accent" : "bg-bg-soft text-slate-500 hover:text-slate-300"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={daily}
              onChange={(e) => setDaily(e.target.checked)}
              disabled={days.length > 0}
              className="h-4 w-4 accent-accent"
            />
            Daily
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={negative}
              onChange={(e) => setNegative(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Anti-habit
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
              disabled={negative}
              className="h-4 w-4 accent-accent"
            />
            Mandatory
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent/90 px-3 py-2 text-sm font-semibold text-bg hover:bg-accent"
          >
            <Check size={15} /> Save
          </button>
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.li>
  );
}

interface Suggestion {
  title: string;
  stat: string;
  xp: number;
}

export default function QuestsPage() {
  const {
    state,
    hydrated,
    addQuest,
    completeQuest,
    removeQuest,
    uncompleteQuest,
    toggleSubtask,
    addTemplate,
    removeTemplate,
    updateQuest,
    rescheduleQuest,
  } = useGameState();

  const statList = Object.values(state.stats);
  const [title, setTitle] = useState("");
  const [stat, setStat] = useState<StatKey>(statList[0]?.key ?? "body");
  const [xp, setXp] = useState(30);
  const [daily, setDaily] = useState(false);
  const [negative, setNegative] = useState(false);
  const [mandatory, setMandatory] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [subtasksRaw, setSubtasksRaw] = useState("");
  const [quickText, setQuickText] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [search, setSearch] = useState("");
  const [wager, setWager] = useState(0);

  // Editing & multi-select (bulk actions).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDays, setBulkDays] = useState<number[]>([]);

  // Voice quick-add via the Web Speech API (feature-detected; Chrome/Safari).
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const voiceSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => VoiceRecognition;
      webkitSpeechRecognition?: new () => VoiceRecognition;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) setQuickText(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  // AI suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState<string | null>(null);

  const today = localDay();
  const term = search.trim().toLowerCase();
  const active = state.quests.filter(
    (q) => !q.done && dueToday(q) && (!term || q.title.toLowerCase().includes(term)),
  );
  const doneToday = state.quests.filter((q) => q.done && q.completedAt?.startsWith(today));

  const label = (key: StatKey) => state.stats[key]?.label ?? key;
  const color = (key: StatKey) => state.stats[key]?.color ?? statColor(key);

  // ─── Multi-select / bulk actions ───────────────────────────────────────────
  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
    setBulkDays([]);
  };
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAll = () => setSelected(new Set(active.map((q) => q.id)));
  const selectedIds = active.filter((q) => selected.has(q.id)).map((q) => q.id);
  const completeSelected = () => {
    selectedIds.forEach((id) => completeQuest(id));
    exitSelect();
  };
  const deleteSelected = () => {
    if (!confirm(`Delete ${selectedIds.length} quest(s)? This can't be undone.`)) return;
    selectedIds.forEach((id) => removeQuest(id));
    exitSelect();
  };
  const rescheduleSelected = () => {
    if (!bulkDays.length) return;
    selectedIds.forEach((id) => rescheduleQuest(id, bulkDays));
    exitSelect();
  };
  const toggleBulkDay = (d: number) =>
    setBulkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

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
      difficulty,
      wager: !negative && wager > 0 ? wager : undefined,
      mandatory: mandatory && !negative,
    });
    setTitle("");
    setXp(30);
    setDaily(false);
    setNegative(false);
    setMandatory(false);
    setDays([]);
    setSubtasksRaw("");
    setDifficulty("normal");
    setWager(0);
  };

  const quickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickText.trim();
    if (!text) return;
    addQuest({ title: text, stat: suggestStat(text, Object.keys(state.stats)), xp: 30 });
    setQuickText("");
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
            <CardTitle>Quick Add</CardTitle>
            <form onSubmit={quickAdd} className="flex gap-2">
              <input
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder={listening ? "Listening…" : "e.g. went to the gym"}
                className="flex-1 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={startVoice}
                  aria-label={listening ? "Stop listening" : "Add by voice"}
                  className={`flex items-center justify-center rounded-lg border px-3 py-2 ${
                    listening
                      ? "border-body bg-body/15 text-body animate-pulse"
                      : "border-line bg-bg-soft text-slate-300 hover:border-accent hover:text-accent"
                  }`}
                >
                  <Mic size={15} />
                </button>
              )}
              <button
                type="submit"
                aria-label="Quick add"
                className="flex items-center gap-1.5 rounded-lg bg-accent/90 px-3 py-2 text-sm font-semibold text-bg hover:bg-accent"
              >
                <Wand2 size={15} />
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              Type{voiceSupported ? " or speak" : ""} what you did — we&apos;ll guess the stat. +30 XP.
            </p>
          </Card>

          <Card>
            <CardTitle>Routines</CardTitle>
            <div className="flex flex-wrap gap-2">
              {ROUTINES.map((r) => (
                <button
                  key={r.name}
                  onClick={() =>
                    r.quests.forEach((qq) =>
                      addQuest({
                        title: qq.title,
                        stat: qq.stat,
                        xp: qq.xp,
                        difficulty: qq.difficulty,
                        daily: true,
                      }),
                    )
                  }
                  className="rounded-full border border-line bg-bg-soft px-3 py-1.5 text-xs text-slate-200 hover:border-accent"
                >
                  + {r.name} ({r.quests.length})
                </button>
              ))}
            </div>
          </Card>

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

              <div>
                <p className="mb-1.5 text-xs text-slate-500">Difficulty</p>
                <div className="flex gap-1">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`h-8 flex-1 rounded-md text-xs font-medium capitalize ${
                        difficulty === d
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

              {/* Coin wager */}
              <div className={negative ? "opacity-40" : ""}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Wager coins (optional)</p>
                  <span className="flex items-center gap-1 text-[11px] text-amber">
                    <Coins size={11} /> {state.coins}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={state.coins}
                    value={wager}
                    disabled={negative}
                    onChange={(e) => setWager(Math.max(0, Math.min(state.coins, Number(e.target.value))))}
                    className="tabular w-24 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent disabled:cursor-not-allowed"
                    aria-label="Wager coins"
                  />
                  <p className="text-[11px] text-slate-500">
                    {wager > 0 ? `Win ${wager * 2} back on completion.` : "Stake coins, win 2× when you finish."}
                  </p>
                </div>
              </div>

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
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={mandatory}
                    onChange={(e) => setMandatory(e.target.checked)}
                    disabled={negative}
                    className="h-4 w-4 accent-accent"
                  />
                  Mandatory (penalty if skipped)
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

          {state.templates.length > 0 && (
            <Card>
              <CardTitle>Templates</CardTitle>
              <div className="flex flex-wrap gap-2">
                {state.templates.map((t) => (
                  <span
                    key={t.id}
                    className="flex items-center gap-1 rounded-full border border-line bg-bg-soft px-2.5 py-1 text-xs text-slate-200"
                  >
                    <button
                      onClick={() =>
                        addQuest({
                          title: t.title,
                          stat: t.stat,
                          xp: t.xp,
                          daily: t.daily,
                          difficulty: t.difficulty,
                        })
                      }
                      className="hover:text-accent"
                    >
                      {t.title}
                    </button>
                    <button
                      onClick={() => removeTemplate(t.id)}
                      aria-label="Remove template"
                      className="text-slate-600 hover:text-body"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Today / active */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Today &amp; Active ({active.length})
              </h2>
              <div className="flex items-center gap-2">
                {active.length > 0 && (
                  <button
                    onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      selectMode
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-line bg-bg-soft text-slate-300 hover:text-slate-100"
                    }`}
                  >
                    <ListChecks size={13} /> {selectMode ? "Done" : "Select"}
                  </button>
                )}
                <div className="flex items-center gap-1.5 rounded-lg border border-line bg-bg-soft px-2 py-1">
                  <Search size={13} className="text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-28 bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Bulk action bar */}
            {selectMode && (
              <div className="mb-3 rounded-lg border border-accent/40 bg-accent/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    {selected.size} selected
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={selectAll} className="text-accent hover:underline">
                      All
                    </button>
                    <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:underline">
                      None
                    </button>
                  </div>
                </div>

                {selected.size > 0 && (
                  <div className="mt-3 flex flex-col gap-3">
                    <div>
                      <p className="mb-1.5 text-[11px] text-slate-500">Reschedule to weekdays, then apply:</p>
                      <div className="flex gap-1">
                        {DOW.map((d, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleBulkDay(i)}
                            title={DOW_FULL[i]}
                            className={`h-8 flex-1 rounded-md text-xs font-medium ${
                              bulkDays.includes(i)
                                ? "bg-accent/20 text-accent"
                                : "bg-bg-soft text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={completeSelected}
                        className="flex items-center gap-1.5 rounded-lg bg-accent/90 px-3 py-2 text-xs font-semibold text-bg hover:bg-accent"
                      >
                        <Check size={14} /> Complete
                      </button>
                      <button
                        onClick={rescheduleSelected}
                        disabled={bulkDays.length === 0}
                        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-slate-200 hover:border-accent disabled:opacity-40"
                      >
                        <CalendarClock size={14} /> Reschedule
                      </button>
                      <button
                        onClick={deleteSelected}
                        className="flex items-center gap-1.5 rounded-lg border border-body/50 px-3 py-2 text-xs font-medium text-body hover:bg-body/10"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {active.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Nothing due. Add a quest or accept the daily side quest on the dashboard.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {active.map((q) =>
                    editingId === q.id ? (
                      <EditQuestForm
                        key={q.id}
                        quest={q}
                        statList={statList}
                        onSave={(patch) => {
                          updateQuest(q.id, patch);
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <QuestRow
                        key={q.id}
                        quest={q}
                        statLabel={label(q.stat)}
                        color={color(q.stat)}
                        onComplete={() => completeQuest(q.id)}
                        onRemove={() => removeQuest(q.id)}
                        onToggleSub={(subId) => toggleSubtask(q.id, subId)}
                        onEdit={() => setEditingId(q.id)}
                        selectMode={selectMode}
                        selected={selected.has(q.id)}
                        onToggleSelect={() => toggleSelect(q.id)}
                        onFavorite={() =>
                          addTemplate({
                            title: q.title,
                            stat: q.stat,
                            xp: q.xp,
                            daily: q.daily,
                            difficulty: q.difficulty,
                          })
                        }
                      />
                    ),
                  )}
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
                      onUndo={rules(state).allowUndo ? () => uncompleteQuest(q.id) : undefined}
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
