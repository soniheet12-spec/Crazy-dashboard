"use client";

import { Gift, TrendingDown, CalendarRange, Sparkles } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { characterLevel, totalXp } from "@/lib/leveling";
import { deriveClass } from "@/lib/classes";
import { localDay, addDays, shortLabel } from "@/lib/dates";
import { AvatarBlock } from "@/components/AvatarBlock";
import { StatRadar } from "@/components/StatRadar";
import { XpLineChart } from "@/components/XpLineChart";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { StatBars } from "@/components/StatBars";
import { ComboMeter } from "@/components/ComboMeter";
import { ShareCard } from "@/components/ShareCard";
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

function weeklyReview(state: GameState) {
  const today = localDay();
  const start = addDays(today, -6);
  const inWeek = (d: string) => d >= start && d <= today;
  const weekXp = state.xpHistory.filter((p) => inWeek(p.date)).reduce((s, p) => s + p.xp, 0);
  const best = state.xpHistory
    .filter((p) => inWeek(p.date))
    .sort((a, b) => b.xp - a.xp)[0];
  const since = Date.now() - 7 * 86_400_000;
  const questsDone = state.quests.filter(
    (q) => q.done && q.completedAt && new Date(q.completedAt).getTime() >= since,
  ).length;
  return { weekXp, bestDay: best, questsDone };
}

export default function DashboardPage() {
  const { state, hydrated, claimDailyBonus } = useGameState();
  const cl = characterLevel(state.stats);
  const klass = deriveClass(state.stats, cl);

  const stats = Object.values(state.stats);
  const neglected = stats.length ? [...stats].sort((a, b) => a.level - b.level || a.xp - b.xp)[0] : null;
  const bonusClaimed = state.lastLoginBonus === localDay();
  const review = weeklyReview(state);

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
        />

        {/* Daily bonus · neglected stat · weekly review */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card className="flex flex-col">
            <CardTitle>Daily Bonus</CardTitle>
            <p className="mb-3 flex-1 text-sm text-slate-400">
              {bonusClaimed
                ? "Claimed today — come back tomorrow for more."
                : "Claim your daily blessing: bonus XP for your weakest stat + guaranteed loot."}
            </p>
            <button
              onClick={claimDailyBonus}
              disabled={bonusClaimed}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber/90 px-3 py-2 text-sm font-semibold text-bg hover:bg-amber disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-slate-500"
            >
              <Gift size={15} /> {bonusClaimed ? "Claimed" : "Claim bonus"}
            </button>
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
                    rebalance your build.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Add a stat to get started.</p>
            )}
          </Card>

          <Card>
            <CardTitle>This Week</CardTitle>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="tabular text-xl font-bold text-accent">{review.weekXp}</p>
                <p className="text-[11px] text-slate-500">XP earned</p>
              </div>
              <div>
                <p className="tabular text-xl font-bold text-slate-100">{review.questsDone}</p>
                <p className="text-[11px] text-slate-500">quests done</p>
              </div>
              <div>
                <p className="tabular text-xl font-bold text-amber">{state.streak.current}</p>
                <p className="text-[11px] text-slate-500">day streak</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarRange size={13} />
              {review.bestDay && review.bestDay.xp > 0
                ? `Best day: ${shortLabel(review.bestDay.date)} (${review.bestDay.xp} XP)`
                : "Log a quest to start your week."}
            </p>
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
