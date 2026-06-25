"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  Repeat,
  CalendarClock,
  Dices,
  Coins,
  AlertTriangle,
  Moon,
  SlidersHorizontal,
  Zap,
  Flame,
  Copy,
  Target,
  Bookmark,
  Trash2,
  Wrench,
} from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { Card, HydrationGate, PageHeader, statColor } from "@/components/ui";
import type { Quest, StatKey } from "@/lib/types";

// Monday-first display order, mapped to JS getDay() indices (0=Sun..6=Sat).
const WEEK: { wd: number; label: string; short: string }[] = [
  { wd: 1, label: "Monday", short: "Mon" },
  { wd: 2, label: "Tuesday", short: "Tue" },
  { wd: 3, label: "Wednesday", short: "Wed" },
  { wd: 4, label: "Thursday", short: "Thu" },
  { wd: 5, label: "Friday", short: "Fri" },
  { wd: 6, label: "Saturday", short: "Sat" },
  { wd: 0, label: "Sunday", short: "Sun" },
];

/** Quests that belong on a given weekday column. */
function questsForDay(quests: Quest[], wd: number, isToday: boolean): Quest[] {
  return quests.filter((q) => {
    if (q.negative) return false;
    if (q.daily) return true;
    if (q.days && q.days.length) return q.days.includes(wd);
    // One-off / side quests have no schedule — only surface them under today.
    return isToday && !q.done;
  });
}

/** The weekdays a quest currently repeats on (all 7 when it's a daily). */
function scheduledDays(q: Quest): number[] {
  if (q.daily) return [0, 1, 2, 3, 4, 5, 6];
  if (q.days && q.days.length) return q.days;
  return [];
}

export default function PlannerPage() {
  const {
    state,
    hydrated,
    completeQuest,
    rescheduleQuest,
    updateSettings,
    saveWeekTemplate,
    loadWeekTemplate,
    removeWeekTemplate,
  } = useGameState();
  const todayWd = new Date().getDay();
  const [filter, setFilter] = useState<StatKey | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [copySource, setCopySource] = useState<number>(todayWd);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [tplName, setTplName] = useState("");

  const statList = Object.values(state.stats);
  const label = (key: StatKey) => state.stats[key]?.label ?? key;
  const color = (key: StatKey) => state.stats[key]?.color ?? statColor(key);
  const goal = state.settings.dailyXpGoal ?? 100;
  const weekTemplates = state.weekTemplates ?? [];

  // Calendar dates for the current Mon→Sun week, purely for orientation.
  const monday = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // back up to Monday
    return now;
  }, []);

  const matchesFilter = (q: Quest) => filter === "all" || q.stat === filter;

  const days = WEEK.map((d, i) => {
    const isToday = d.wd === todayWd;
    const qs = questsForDay(state.quests, d.wd, isToday).filter(matchesFilter);
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      ...d,
      isToday,
      qs,
      date,
      xp: qs.reduce((s, q) => s + q.xp, 0),
      done: isToday ? qs.filter((q) => q.done).length : 0,
      earned: isToday ? qs.filter((q) => q.done).reduce((s, q) => s + q.xp, 0) : 0,
    };
  });

  const weekXp = days.reduce((s, d) => s + d.xp, 0);
  const slots = days.reduce((s, d) => s + d.qs.length, 0);
  const today = days.find((d) => d.isToday);
  const busiest = [...days].sort((a, b) => b.qs.length - a.qs.length)[0];

  const toggleDay = (q: Quest, wd: number) => {
    const cur = new Set(scheduledDays(q));
    if (cur.has(wd)) cur.delete(wd);
    else cur.add(wd);
    rescheduleQuest(q.id, Array.from(cur));
  };

  // Copy every (positive) quest on the source day onto the chosen target days,
  // keeping it on the source day too (additive — nothing is removed).
  const copyDay = () => {
    if (!copyTargets.length) return;
    const fromToday = copySource === todayWd;
    questsForDay(state.quests, copySource, fromToday)
      .filter((q) => !q.negative)
      .forEach((q) => {
        const union = new Set<number>(scheduledDays(q));
        union.add(copySource);
        copyTargets.forEach((t) => union.add(t));
        rescheduleQuest(q.id, Array.from(union));
      });
    setCopyTargets([]);
  };
  const toggleCopyTarget = (wd: number) =>
    setCopyTargets((prev) => (prev.includes(wd) ? prev.filter((x) => x !== wd) : [...prev, wd]));

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Weekly Planner"
        subtitle="Lay out your recurring quests across the week — tap a quest to reschedule it."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-slate-200 shadow-glow">
            <Zap size={15} className="text-accent" />
            <span className="tabular font-semibold text-slate-100">{weekXp}</span>
            <span className="text-slate-400">XP planned</span>
          </div>
        }
      />

      {/* Week summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Quest slots" value={String(slots)} hint="this week" icon={<CalendarClock size={14} />} />
        <SummaryTile label="XP planned" value={String(weekXp)} hint="full week" icon={<Zap size={14} />} accent />
        <SummaryTile
          label="Done today"
          value={today ? `${today.done}/${today.qs.length}` : "—"}
          hint={
            today && today.qs.length
              ? `${Math.round((today.done / today.qs.length) * 100)}% complete`
              : "rest day"
          }
          icon={<Check size={14} />}
        />
        <SummaryTile
          label="Busiest day"
          value={busiest && busiest.qs.length ? busiest.short : "—"}
          hint={busiest && busiest.qs.length ? `${busiest.qs.length} quests` : "all clear"}
          icon={<Flame size={14} />}
        />
      </div>

      {/* Stat filter */}
      {statList.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          {statList.map((s) => (
            <FilterChip key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)} dot={color(s.key)}>
              {s.label}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Planner tools */}
      <details className="card group mb-5 p-0">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-200">
          <span className="flex items-center gap-2">
            <Wrench size={15} className="text-accent" /> Planner tools
          </span>
          <span className="text-xs text-slate-500 group-open:hidden">Goal · Copy day · Templates</span>
        </summary>

        <div className="grid grid-cols-1 gap-5 border-t border-line/60 p-4 lg:grid-cols-3">
          {/* Daily XP goal */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Target size={13} /> Daily XP goal
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={10}
                value={goal}
                onChange={(e) => updateSettings({ dailyXpGoal: Math.max(0, Number(e.target.value)) })}
                className="tabular w-24 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
                aria-label="Daily XP goal"
              />
              <span className="text-xs text-slate-500">XP / day</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Each day shows a ring tracking planned XP against this goal.
            </p>
          </div>

          {/* Copy a day */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Copy size={13} /> Copy a day
            </p>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">From</span>
              <select
                value={copySource}
                onChange={(e) => setCopySource(Number(e.target.value))}
                className="flex-1 rounded-lg border border-line bg-bg-soft px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-accent"
                aria-label="Copy from day"
              >
                {WEEK.map((w) => (
                  <option key={w.wd} value={w.wd}>{w.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-2 flex gap-1">
              {WEEK.filter((w) => w.wd !== copySource).map((w) => (
                <button
                  key={w.wd}
                  type="button"
                  onClick={() => toggleCopyTarget(w.wd)}
                  title={w.label}
                  className={`h-7 flex-1 rounded text-[10px] font-medium transition-colors ${
                    copyTargets.includes(w.wd)
                      ? "bg-accent/25 text-accent"
                      : "bg-bg-soft text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {w.short[0]}
                </button>
              ))}
            </div>
            <button
              onClick={copyDay}
              disabled={copyTargets.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10 disabled:opacity-40"
            >
              <Copy size={13} /> Copy to {copyTargets.length || "…"} day{copyTargets.length === 1 ? "" : "s"}
            </button>
          </div>

          {/* Week templates */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Bookmark size={13} /> Week templates
            </p>
            <div className="mb-2 flex gap-2">
              <input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Name this plan…"
                className="min-w-0 flex-1 rounded-lg border border-line bg-bg-soft px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
              />
              <button
                onClick={() => {
                  saveWeekTemplate(tplName);
                  setTplName("");
                }}
                className="shrink-0 rounded-lg bg-accent/90 px-3 py-2 text-xs font-semibold text-bg hover:bg-accent"
              >
                Save
              </button>
            </div>
            {weekTemplates.length === 0 ? (
              <p className="text-[11px] text-slate-500">Save your current recurring quests to reuse later.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {weekTemplates.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-line/70 bg-bg-soft/60 px-2.5 py-1.5"
                  >
                    <button
                      onClick={() => loadWeekTemplate(t.id)}
                      className="min-w-0 flex-1 text-left"
                      title={`Load "${t.name}"`}
                    >
                      <span className="block truncate text-xs text-slate-100">{t.name}</span>
                      <span className="text-[10px] text-slate-500">{t.quests.length} quests</span>
                    </button>
                    <button
                      onClick={() => removeWeekTemplate(t.id)}
                      aria-label={`Delete ${t.name}`}
                      className="shrink-0 text-slate-600 hover:text-body"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>

      {/* Day board — one full-width lane per day */}
      <div className="flex flex-col gap-3">
        {days.map((d) => {
          const tracked = d.isToday ? d.earned : d.xp;
          const ringPct = goal > 0 ? Math.round((100 * tracked) / goal) : 0;
          const dateLabel = d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const summary = d.isToday
            ? `${d.done}/${d.qs.length} done · ${d.earned}/${goal} XP`
            : d.qs.length
              ? `${d.qs.length} quest${d.qs.length === 1 ? "" : "s"} · +${d.xp} XP`
              : "rest day";
          return (
            <Card
              key={d.wd}
              className={`overflow-hidden p-0 ${d.isToday ? "ring-1 ring-accent/60 shadow-glow" : ""}`}
            >
              <div className="flex flex-col sm:flex-row">
                {/* Day rail */}
                <div
                  className={`flex shrink-0 items-center gap-3 border-b border-line/60 px-4 py-3 sm:w-52 sm:border-b-0 sm:border-r sm:py-4 ${
                    d.isToday ? "bg-accent/5" : "bg-bg-soft/30"
                  }`}
                >
                  <GoalRing pct={ringPct} accent={d.isToday} size={44} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span
                        className={`text-base font-semibold ${d.isToday ? "text-accent" : "text-slate-100"}`}
                      >
                        {d.label}
                      </span>
                      {d.isToday && (
                        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                          now
                        </span>
                      )}
                    </div>
                    <p className="tabular mt-0.5 text-xs text-slate-500">{dateLabel}</p>
                    <p className="mt-1 text-xs text-slate-400">{summary}</p>
                  </div>
                </div>

                {/* Quests */}
                <div className="min-w-0 flex-1 p-3 sm:p-4">
                  {d.qs.length === 0 ? (
                    <div className="flex h-full min-h-[2.5rem] items-center gap-2 text-slate-600">
                      <Moon size={15} className="opacity-60" />
                      <p className="text-xs">Rest day — nothing scheduled.</p>
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {d.qs.map((q) => {
                        const done = d.isToday && q.done;
                        const key = `${d.wd}:${q.id}`;
                        const open = editing === key;
                        return (
                          <li
                            key={key}
                            className={`rounded-lg border px-3 py-2.5 transition-colors ${
                              open ? "border-accent/50 bg-bg-hover/60" : "border-line/60 bg-bg-soft/50"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {d.isToday && !q.done ? (
                                <button
                                  onClick={() => completeQuest(q.id)}
                                  aria-label={`Complete ${q.title}`}
                                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-transparent transition-colors hover:text-accent"
                                  style={{ borderColor: color(q.stat) }}
                                >
                                  <Check size={13} />
                                </button>
                              ) : (
                                <span
                                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: color(q.stat), opacity: done ? 1 : 0.5 }}
                                />
                              )}

                              <div className="min-w-0 flex-1">
                                <p
                                  className={`truncate text-sm ${
                                    done ? "text-slate-500 line-through" : "text-slate-100"
                                  }`}
                                >
                                  {q.sideQuest && <Dices size={11} className="mr-1 inline text-accent" />}
                                  {q.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                  <span className="font-medium" style={{ color: color(q.stat) }}>
                                    {label(q.stat)}
                                  </span>
                                  <span className="tabular">+{q.xp} XP</span>
                                  {q.daily && <Repeat size={11} aria-label="daily" />}
                                  {q.days && q.days.length > 0 && (
                                    <CalendarClock size={11} aria-label="scheduled" />
                                  )}
                                  {q.mandatory && (
                                    <AlertTriangle size={11} className="text-body" aria-label="mandatory" />
                                  )}
                                  {q.wager ? (
                                    <span className="flex items-center gap-0.5 text-amber">
                                      <Coins size={11} />
                                      {q.wager}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <button
                                onClick={() => setEditing(open ? null : key)}
                                aria-label={`Reschedule ${q.title}`}
                                className={`mt-0.5 shrink-0 transition-colors ${
                                  open ? "text-accent" : "text-slate-600 hover:text-accent"
                                }`}
                              >
                                <SlidersHorizontal size={14} />
                              </button>
                            </div>

                            {/* Inline reschedule editor */}
                            {open && (
                              <div className="mt-2.5 border-t border-line/60 pt-2.5">
                                <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                                  Repeat on
                                </p>
                                <div className="flex gap-1">
                                  {WEEK.map((w) => {
                                    const on = scheduledDays(q).includes(w.wd);
                                    return (
                                      <button
                                        key={w.wd}
                                        onClick={() => toggleDay(q, w.wd)}
                                        title={w.label}
                                        className={`h-8 flex-1 rounded text-[11px] font-medium transition-colors ${
                                          on
                                            ? "bg-accent/25 text-accent"
                                            : "bg-bg-soft text-slate-500 hover:text-slate-300"
                                        }`}
                                      >
                                        {w.short[0]}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Repeat size={10} /> daily
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock size={10} /> scheduled
        </span>
        <span className="flex items-center gap-1">
          <Dices size={10} className="text-accent" /> side quest
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle size={10} className="text-body" /> mandatory
        </span>
        <span className="flex items-center gap-1">
          <Coins size={10} className="text-amber" /> wagered
        </span>
        <span className="flex items-center gap-1">
          <SlidersHorizontal size={10} /> tap to reschedule
        </span>
      </div>
    </HydrationGate>
  );
}

/** Circular progress ring for a day's XP vs the daily goal. */
function GoalRing({ pct, accent, size = 26 }: { pct: number; accent?: boolean; size?: number }) {
  const sw = size >= 40 ? 4 : 3;
  const c = size / 2;
  const r = c - sw / 2 - 1;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const stroke = accent ? "rgb(var(--accent-rgb))" : "rgb(var(--accent-rgb) / 0.5)";
  const showLabel = size >= 40;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={`${p}% of daily goal`}
    >
      <g transform={`rotate(-90 ${c} ${c})`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={sw} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - p / 100)}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </g>
      {showLabel ? (
        <text
          x={c}
          y={c}
          textAnchor="middle"
          dominantBaseline="central"
          className="tabular font-semibold"
          fontSize={size * 0.28}
          fill={accent ? "rgb(var(--accent-rgb))" : "rgb(148 163 184)"}
        >
          {p}
        </text>
      ) : (
        p >= 100 && <circle cx={c} cy={c} r="2.6" fill={stroke} />
      )}
    </svg>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`card flex flex-col gap-1 p-3 ${accent ? "border-accent/30" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
        <span className={accent ? "text-accent" : "text-slate-500"}>{icon}</span>
        {label}
      </div>
      <p className={`tabular text-lg font-bold leading-none ${accent ? "text-accent" : "text-slate-100"}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-line bg-bg-soft text-slate-400 hover:text-slate-200"
      }`}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
      {children}
    </button>
  );
}
