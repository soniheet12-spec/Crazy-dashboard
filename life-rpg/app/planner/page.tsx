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
  const { state, hydrated, completeQuest, rescheduleQuest } = useGameState();
  const todayWd = new Date().getDay();
  const [filter, setFilter] = useState<StatKey | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);

  const statList = Object.values(state.stats);
  const label = (key: StatKey) => state.stats[key]?.label ?? key;
  const color = (key: StatKey) => state.stats[key]?.color ?? statColor(key);

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
    };
  });

  const weekXp = days.reduce((s, d) => s + d.xp, 0);
  const slots = days.reduce((s, d) => s + d.qs.length, 0);
  const maxXp = Math.max(1, ...days.map((d) => d.xp));
  const today = days.find((d) => d.isToday);
  const busiest = [...days].sort((a, b) => b.qs.length - a.qs.length)[0];

  const toggleDay = (q: Quest, wd: number) => {
    const cur = new Set(scheduledDays(q));
    if (cur.has(wd)) cur.delete(wd);
    else cur.add(wd);
    rescheduleQuest(q.id, Array.from(cur));
  };

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

      {/* Day board */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => {
          const loadPct = Math.round((d.xp / maxXp) * 100);
          const donePct = d.qs.length ? Math.round((d.done / d.qs.length) * 100) : 0;
          return (
            <Card
              key={d.wd}
              className={`flex flex-col gap-2.5 overflow-hidden p-3 ${
                d.isToday ? "ring-1 ring-accent/60 shadow-glow" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-sm font-semibold ${d.isToday ? "text-accent" : "text-slate-200"}`}>
                    {d.short}
                  </span>
                  <span className="tabular text-[10px] text-slate-500">{d.date.getDate()}</span>
                </div>
                {d.isToday ? (
                  <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                    Today
                  </span>
                ) : (
                  <span className="tabular text-[10px] text-slate-600">{d.qs.length || ""}</span>
                )}
              </div>

              {/* Completion (today) / load (other days) bar */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-bg-soft">
                <div
                  className={`bar-fill h-full rounded-full ${d.isToday ? "bg-accent" : "bg-accent/30"}`}
                  style={{ width: `${d.isToday ? donePct : loadPct}%` }}
                />
              </div>

              {/* Quests */}
              {d.qs.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-5 text-slate-600">
                  <Moon size={16} className="opacity-60" />
                  <p className="text-[11px]">Rest day</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {d.qs.map((q) => {
                    const done = d.isToday && q.done;
                    const key = `${d.wd}:${q.id}`;
                    const open = editing === key;
                    return (
                      <li
                        key={key}
                        className={`rounded-lg border px-2.5 py-2 transition-colors ${
                          open ? "border-accent/50 bg-bg-hover/60" : "border-line/60 bg-bg-soft/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
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
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color(q.stat), opacity: done ? 1 : 0.5 }}
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-xs ${
                                done ? "text-slate-500 line-through" : "text-slate-100"
                              }`}
                            >
                              {q.sideQuest && <Dices size={10} className="mr-0.5 inline text-accent" />}
                              {q.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                              <span style={{ color: color(q.stat) }}>{label(q.stat)}</span>
                              <span className="tabular">+{q.xp}</span>
                              {q.daily && <Repeat size={9} aria-label="daily" />}
                              {q.days && q.days.length > 0 && <CalendarClock size={9} aria-label="scheduled" />}
                              {q.mandatory && <AlertTriangle size={9} className="text-body" aria-label="mandatory" />}
                              {q.wager ? (
                                <span className="flex items-center gap-0.5 text-amber">
                                  <Coins size={9} />
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
                            <SlidersHorizontal size={13} />
                          </button>
                        </div>

                        {/* Inline reschedule editor */}
                        {open && (
                          <div className="mt-2 border-t border-line/60 pt-2">
                            <p className="mb-1.5 text-[9px] uppercase tracking-wide text-slate-500">Repeat on</p>
                            <div className="flex gap-1">
                              {WEEK.map((w) => {
                                const on = scheduledDays(q).includes(w.wd);
                                return (
                                  <button
                                    key={w.wd}
                                    onClick={() => toggleDay(q, w.wd)}
                                    title={w.label}
                                    className={`h-6 flex-1 rounded text-[10px] font-medium transition-colors ${
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
