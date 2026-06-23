"use client";

import { Check, Repeat, CalendarClock, Dices } from "lucide-react";
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

export default function PlannerPage() {
  const { state, hydrated, completeQuest } = useGameState();
  const todayWd = new Date().getDay();

  const label = (key: StatKey) => state.stats[key]?.label ?? key;
  const color = (key: StatKey) => state.stats[key]?.color ?? statColor(key);

  const weekXp = WEEK.reduce((sum, d) => {
    const qs = questsForDay(state.quests, d.wd, d.wd === todayWd);
    return sum + qs.reduce((s, q) => s + q.xp, 0);
  }, 0);

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Weekly Planner"
        subtitle="See your recurring quests laid out across the week."
        action={
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-slate-200 shadow-glow">
            <span className="tabular font-semibold text-slate-100">{weekXp}</span> XP planned
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {WEEK.map((d) => {
          const isToday = d.wd === todayWd;
          const qs = questsForDay(state.quests, d.wd, isToday);
          return (
            <Card
              key={d.wd}
              className={`flex flex-col gap-2 p-3 ${isToday ? "ring-1 ring-accent/60 shadow-glow" : ""}`}
            >
              <div className="flex items-baseline justify-between">
                <p className={`text-sm font-semibold ${isToday ? "text-accent" : "text-slate-200"}`}>
                  {d.short}
                  {isToday && <span className="ml-1 text-[10px] uppercase tracking-wide">· today</span>}
                </p>
                <span className="tabular text-[10px] text-slate-500">{qs.length}</span>
              </div>

              {qs.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-slate-600">Rest day</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {qs.map((q) => {
                    const done = isToday && q.done;
                    return (
                      <li
                        key={`${d.wd}-${q.id}`}
                        className="rounded-lg border border-line/60 bg-bg-soft/50 px-2.5 py-2"
                      >
                        <div className="flex items-start gap-2">
                          {isToday && !q.done ? (
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
                            <p className={`truncate text-xs ${done ? "text-slate-500 line-through" : "text-slate-100"}`}>
                              {q.sideQuest && <Dices size={10} className="mr-0.5 inline text-accent" />}
                              {q.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                              <span style={{ color: color(q.stat) }}>{label(q.stat)}</span>
                              <span className="tabular">+{q.xp}</span>
                              {q.daily && <Repeat size={9} />}
                              {q.days && q.days.length > 0 && <CalendarClock size={9} />}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Daily quests show every day; scheduled quests appear on their chosen weekdays. Tick items off under
        today.
      </p>
    </HydrationGate>
  );
}
