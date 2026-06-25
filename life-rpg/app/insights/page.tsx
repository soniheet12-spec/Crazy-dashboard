"use client";

import { useState } from "react";
import {
  Zap,
  Target,
  CalendarCheck,
  Flame,
  Gem,
  Clock,
  Smile,
  Sparkles,
  TrendingUp,
  Scale,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { computeInsights, computeForecast, statBalance, DOW_LABELS, hourLabel } from "@/lib/insights";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { XpForecastChart } from "@/components/XpForecastChart";
import { StatRadar } from "@/components/StatRadar";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";

interface CoachPlan {
  headline: string;
  focus: string;
  actions: string[];
}

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
  const avgMood = state.moods.length
    ? state.moods.reduce((s, m) => s + m.value, 0) / state.moods.length
    : null;

  const forecast = computeForecast(state.xpHistory);
  const balance = statBalance(state);
  const maxLevel = Math.max(1, ...balance.map((s) => s.level));
  const goals = [
    ...state.bosses.filter((b) => b.progress < b.target).map((b) => b.title),
    ...(state.dungeons ?? []).filter((d) => !d.clearedAt).map((d) => d.name),
  ];

  const [coachLoading, setCoachLoading] = useState(false);
  const [coachPlan, setCoachPlan] = useState<CoachPlan | null>(null);
  const [coachMsg, setCoachMsg] = useState<string | null>(null);

  const runCoach = async () => {
    setCoachLoading(true);
    setCoachMsg(null);
    setCoachPlan(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stats: balance.map((s) => ({ label: s.label, level: s.level })),
          weakest: balance[0]?.label,
          streak: state.streak.current,
          recentXp: forecast.dailyAvg * 7,
          dailyAvg: forecast.dailyAvg,
          bestDow: ins.bestDow,
          goals,
        }),
      });
      const json = await res.json();
      if (res.ok && json.plan) setCoachPlan(json.plan as CoachPlan);
      else setCoachMsg(json.message ?? "Couldn't get coaching right now.");
    } catch {
      setCoachMsg("Network error.");
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader title="Insights" subtitle="Patterns from everything you've logged." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={Target} label="quests done" value={ins.totalQuests} />
        <Stat icon={Zap} label="total XP" value={ins.totalXp.toLocaleString()} />
        <Stat icon={CalendarCheck} label="active days" value={ins.activeDays} />
        <Stat icon={Flame} label="longest streak" value={ins.longestStreak} />
        <Stat icon={Gem} label="loot collected" value={ins.loot} />
        <Stat icon={Smile} label="avg mood" value={avgMood ? `${avgMood.toFixed(1)}/5` : "—"} />
      </div>

      {/* AI coach + XP forecast */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <CardTitle>
              <span className="flex items-center gap-2">
                <Sparkles size={13} /> AI Weekly Coach
              </span>
            </CardTitle>
            <button
              onClick={runCoach}
              disabled={coachLoading}
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/10 disabled:opacity-50"
            >
              {coachLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {coachLoading ? "Thinking…" : coachPlan ? "Refresh" : "Get focus"}
            </button>
          </div>
          {!coachPlan && !coachMsg && !coachLoading && (
            <p className="text-sm text-slate-500">
              Get a personalized focus for the week ahead based on your stats, streak, and pace.
            </p>
          )}
          {coachMsg && <p className="text-sm text-slate-500">{coachMsg}</p>}
          {coachPlan && (
            <div>
              <p className="font-semibold text-slate-100">{coachPlan.headline}</p>
              <p className="mt-1 text-sm text-slate-400">{coachPlan.focus}</p>
              {coachPlan.actions.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {coachPlan.actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <ArrowRight size={14} className="mt-0.5 shrink-0 text-accent" /> {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-1 flex items-center justify-between gap-2">
            <CardTitle>
              <span className="flex items-center gap-2">
                <TrendingUp size={13} /> XP Forecast
              </span>
            </CardTitle>
            <span className="tabular text-xs text-slate-500">~{forecast.projectedTotal} XP next 7d</span>
          </div>
          <XpForecastChart series={forecast.series} />
          <p className="mt-2 text-xs text-slate-500">
            Dashed line projects the week ahead at your recent pace of {forecast.dailyAvg} XP/day.
          </p>
        </Card>
      </div>

      {/* Stat balance */}
      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <CardTitle>
            <span className="flex items-center gap-2">
              <Scale size={13} /> Stat Balance
            </span>
          </CardTitle>
          {balance.some((s) => s.neglected) && (
            <span className="flex items-center gap-1 text-xs text-amber">
              <AlertCircle size={13} /> {balance.filter((s) => s.neglected).length} need attention
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <StatRadar stats={Object.values(state.stats)} />
          <div className="flex flex-col justify-center gap-2.5">
            {balance.map((s) => {
              const c = s.color ?? statColor(s.key);
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                      {s.label}
                      <span className="text-slate-500">Lv {s.level}</span>
                    </span>
                    <span className={s.neglected ? "text-amber" : "text-slate-500"}>
                      {s.recency === null ? "never" : s.recency === 0 ? "today" : `${s.recency}d ago`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bg-soft">
                    <div
                      className="bar-fill h-full rounded-full"
                      style={{ width: `${Math.round((s.level / maxLevel) * 100)}%`, backgroundColor: c }}
                    />
                  </div>
                </div>
              );
            })}
            {balance[0] && (
              <p className="mt-1 text-xs text-slate-500">
                {balance[0].label} is your weakest stat — a little focus there balances your build.
              </p>
            )}
          </div>
        </div>
      </Card>

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
