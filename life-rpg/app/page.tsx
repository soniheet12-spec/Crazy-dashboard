"use client";

import { useGameState } from "@/lib/gameState";
import { characterLevel, totalXp } from "@/lib/leveling";
import { localDay } from "@/lib/dates";
import { AvatarBlock } from "@/components/AvatarBlock";
import { StatRadar } from "@/components/StatRadar";
import { XpLineChart } from "@/components/XpLineChart";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { StatBars } from "@/components/StatBars";
import { Card, CardTitle, HydrationGate, PageHeader } from "@/components/ui";

/** Energy is tied to the "rest" daily quest (falls back to dailies completion). */
function computeEnergy(quests: ReturnType<typeof useGameState>["state"]["quests"]): number {
  const today = localDay();
  const rest = quests.find(
    (q) => q.daily && /rest|recharge|sleep/i.test(q.title),
  );
  if (rest) return rest.done ? 100 : 65;

  const dailies = quests.filter((q) => q.daily);
  if (dailies.length === 0) return 100;
  const doneToday = dailies.filter(
    (q) => q.done && q.completedAt?.startsWith(today),
  ).length;
  return Math.round(40 + 60 * (doneToday / dailies.length));
}

export default function DashboardPage() {
  const { state, hydrated } = useGameState();

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Dashboard"
        subtitle="Your character sheet, updated in real time as you log."
      />

      <div className="grid grid-cols-1 gap-5">
        <AvatarBlock
          characterLevel={characterLevel(state.stats)}
          totalXp={totalXp(state.stats)}
          streakCurrent={state.streak.current}
          energyPct={computeEnergy(state.quests)}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle>Stat Radar</CardTitle>
            <StatRadar stats={Object.values(state.stats)} />
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
          <StatBars stats={Object.values(state.stats)} />
        </Card>
      </div>
    </HydrationGate>
  );
}
