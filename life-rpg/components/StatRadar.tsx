"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { Stat } from "@/lib/types";

export function StatRadar({ stats }: { stats: Stat[] }) {
  const data = stats.map((s) => ({ stat: s.label, level: s.level }));
  const maxLevel = Math.max(5, ...stats.map((s) => s.level + 1));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#1e2a45" />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, maxLevel]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Level"
            dataKey="level"
            stroke="#38bdf8"
            fill="#38bdf8"
            fillOpacity={0.35}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
