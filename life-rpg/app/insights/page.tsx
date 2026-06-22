"use client";

import { Zap, Target, CalendarCheck, Flame, Gem, Clock } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { computeInsights, DOW_LABELS, hourLabel } from "@/lib/insights";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Card, CardTitle, HydrationGate, PageHeader } from "@/components/ui";

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string | number }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <Icon size={18} />
      </span>
      <div>
        <p className="tabular text-lg font-bold text-slate-100">{value}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { state, hydrated } = useGameState();
  const ins = computeInsights(state);
  const maxDow = Math.max(1, ...ins.byDow);
  const maxHour = Math.max(1, ...ins.byHour);

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader title="Insights" subtitle="Patterns from everything you've logged." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat icon={Target} label="quests done" value={ins.totalQuests} />
        <Stat icon={Zap} label="total XP" value={ins.totalXp.toLocaleString()} />
        <Stat icon={CalendarCheck} label="active days" value={ins.activeDays} />
        <Stat icon={Flame} label="longest streak" value={ins.longestStreak} />
        <Stat icon={Gem} label="loot collected" value={ins.loot} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>Most Productive Day</CardTitle>
          <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
            {ins.byDow.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full rounded-t bg-accent/70"
                  style={{ height: `${(n / maxDow) * 120}px`, minHeight: n > 0 ? 4 : 0 }}
                  title={`${n} quests`}
                />
                <span className="text-[10px] text-slate-500">{DOW_LABELS[i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {ins.bestDow ? `You complete the most quests on ${ins.bestDow}.` : "Log some quests to see your rhythm."}
          </p>
        </Card>

        <Card>
          <CardTitle>Time of Day</CardTitle>
          <div className="flex items-end justify-between gap-px" style={{ height: 160 }}>
            {ins.byHour.map((n, h) => (
              <div
                key={h}
                className="flex-1 rounded-t bg-amber/70"
                style={{ height: `${(n / maxHour) * 130}px`, minHeight: n > 0 ? 3 : 0 }}
                title={`${hourLabel(h)} · ${n}`}
              />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={13} />
            {ins.bestHour !== null
              ? `Your power hour is around ${hourLabel(ins.bestHour)}.`
              : "Complete quests to reveal your peak hours."}
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle>Activity — last year</CardTitle>
        <ActivityHeatmap history={state.xpHistory} weeks={52} />
      </Card>
    </HydrationGate>
  );
}
