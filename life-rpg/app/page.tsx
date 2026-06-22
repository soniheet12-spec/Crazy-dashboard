"use client";

import { Gift, TrendingDown, TrendingUp, CalendarRange, Dices, ArrowRight } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { characterLevel, totalXp } from "@/lib/leveling";
import { deriveClass } from "@/lib/classes";
import { seasonProgress, seasonXp } from "@/lib/season";
import { sideQuestForDay } from "@/lib/sidequests";
import { localDay, addDays, shortLabel } from "@/lib/dates";
import { AvatarBlock } from "@/components/AvatarBlock";
import { StatRadar } from "@/components/StatRadar";
import { XpLineChart } from "@/components/XpLineChart";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { StatBars } from "@/components/StatBars";
import { ComboMeter } from "@/components/ComboMeter";
import { ShareCard } from "@/components/ShareCard";
import { Icon } from "@/components/Icon";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";
import type { GameState } from "@/lib/types";

function computeEnergy(quests: GameState["quests"]): number {
  const today = localDay();
  const rest = quests.find((q) => q.daily && /rest|recharge|sleep/i.test(q.title));
  if (rest) return rest.done ? 100 : 65;
  const dailies = quests.filter((q) => q.daily);
  if (dailies.length === 0) return 100;
  const doneToday = dailies.filter((q) => q.done && q.completedAt?.startsWith(today)).length;
  return Math.round(40 + 60 * (doneToday / dailies.length));
}

function periodStats(state: GameState) {
  const today = localDay();
  const sum = (from: string, to: string) =>
    state.xpHistory.filter((p) => p.date >= from && p.date <= to).reduce((s, p) => s + p.xp, 0);
  const weekXp = sum(addDays(today, -6), today);
  const lastWeekXp = sum(addDays(today, -13), addDays(today, -7));
  const monthXp = sum(addDays(today, -29), today);
  const since = Date.now() - 7 * 86_400_000;
  const questsDone = state.quests.filter(
    (q) => q.done && q.completedAt && new Date(q.completedAt).getTime() >= since,
  ).length;
  const best = state.xpHistory
    .filter((p) => p.date >= addDays(today, -6) && p.date <= today)
    .sort((a, b) => b.xp - a.xp)[0];
  return { weekXp, lastWeekXp, monthXp, questsDone, bestDay: best };
}

export default function DashboardPage() {
  const { state, hydrated, claimDailyBonus, acceptSideQuest } = useGameState();
  const cl = characterLevel(state.stats);
  const klass = deriveClass(state.stats, cl);

  const stats = Object.values(state.stats);
  const neglected = stats.length ? [...stats].sort((a, b) => a.level - b.level || a.xp - b.xp)[0] : null;
  const bonusClaimed = state.lastLoginBonus === localDay();
  const sideAvailable = state.lastSideQuest !== localDay();
  const sq = stats.length ? sideQuestForDay(localDay(), Object.keys(state.stats)) : null;
  const p = periodStats(state);
  const weekDelta = p.weekXp - p.lastWeekXp;
  const sp = seasonProgress(seasonXp(state));

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Dashboard"
        subtitle="Your character sheet, updated in real time as you log."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ComboMeter />
            <ShareCard />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5">
        <AvatarBlock
          characterLevel={cl}
          totalXp={totalXp(state.stats)}
          streakCurrent={state.streak.current}
          energyPct={computeEnergy(state.quests)}
          klass={klass}
          coins={state.coins}
          prestige={state.prestige}
        />

        {/* Daily bonus · side quest · needs attention */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card className="flex flex-col">
            <CardTitle>Daily Bonus</CardTitle>
            <p className="mb-3 flex-1 text-sm text-slate-400">
              {bonusClaimed
                ? "Claimed today — come back tomorrow."
                : "Claim a daily blessing: bonus XP for your weakest stat + guaranteed loot."}
            </p>
            <button
              onClick={claimDailyBonus}
              disabled={bonusClaimed}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber/90 px-3 py-2 text-sm font-semibold text-bg hover:bg-amber disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-slate-500"
            >
              <Gift size={15} /> {bonusClaimed ? "Claimed" : "Claim bonus"}
            </button>
          </Card>

          <Card className="flex flex-col">
            <CardTitle>Side Quest of the Day</CardTitle>
            {sideAvailable && sq ? (
              <>
                <div className="mb-3 flex-1">
                  <p className="text-sm font-medium text-slate-100">{sq.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {state.stats[sq.stat]?.label ?? sq.stat} · +{sq.xp} XP
                  </p>
                </div>
                <button
                  onClick={acceptSideQuest}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-accent/90 px-3 py-2 text-sm font-semibold text-bg hover:bg-accent"
                >
                  <Dices size={15} /> Accept quest
                </button>
              </>
            ) : (
              <p className="flex-1 text-sm text-slate-400">
                Accepted today — find it in your Quests list. A new one appears tomorrow.
              </p>
            )}
          </Card>

          <Card>
            <CardTitle>Needs Attention</CardTitle>
            {neglected ? (
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${neglected.color ?? statColor(neglected.key)}22`,
                    color: neglected.color ?? statColor(neglected.key),
                  }}
                >
                  <TrendingDown size={18} />
                </span>
                <div>
                  <p className="font-semibold text-slate-100">{neglected.label} is lagging</p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Lowest stat at Level {neglected.level}. Log a {neglected.label.toLowerCase()} quest to
                    rebalance.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Add a stat to get started.</p>
            )}
          </Card>
        </div>

        {/* This week vs last · season */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card>
            <CardTitle>This Week vs Last</CardTitle>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="tabular text-xl font-bold text-accent">{p.weekXp}</p>
                <p className="text-[11px] text-slate-500">XP this week</p>
              </div>
              <div>
                <p className="tabular text-xl font-bold text-slate-100">{p.questsDone}</p>
                <p className="text-[11px] text-slate-500">quests done</p>
              </div>
              <div>
                <p className="tabular text-xl font-bold text-amber">{p.monthXp}</p>
                <p className="text-[11px] text-slate-500">XP this month</p>
              </div>
            </div>
            <p
              className={`mt-3 flex items-center gap-1.5 text-xs ${
                weekDelta >= 0 ? "text-wealth" : "text-body"
              }`}
            >
              {weekDelta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {weekDelta >= 0 ? "+" : ""}
              {weekDelta} XP vs last week
              {p.bestDay && p.bestDay.xp > 0 && (
                <span className="text-slate-600">· best {shortLabel(p.bestDay.date)}</span>
              )}
            </p>
          </Card>

          <Card>
            <CardTitle>Season Rank</CardTitle>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber/15 text-amber">
                <Icon name={sp.tier.icon} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold text-slate-100">{sp.tier.name}</p>
                  <a href="/skills" className="flex items-center gap-0.5 text-xs text-accent hover:underline">
                    Skills <ArrowRight size={11} />
                  </a>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-bg-soft">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-dim to-amber"
                    style={{ width: `${Math.round(sp.pct * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {sp.next ? `${sp.next.xp - seasonXp(state)} XP to ${sp.next.name}` : "Max tier reached"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle>Stat Radar</CardTitle>
            <StatRadar stats={stats} />
          </Card>
          <Card>
            <CardTitle>XP — last 30 days</CardTitle>
            <XpLineChart history={state.xpHistory} />
          </Card>
        </div>

        <Card>
          <CardTitle>Activity — last 12 weeks</CardTitle>
          <ActivityHeatmap history={state.xpHistory} />
        </Card>

        <Card>
          <CardTitle>Stat Levels</CardTitle>
          <StatBars stats={stats} />
        </Card>
      </div>
    </HydrationGate>
  );
}
