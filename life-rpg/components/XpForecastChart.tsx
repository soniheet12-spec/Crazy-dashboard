"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ForecastPoint } from "@/lib/insights";

/** Cumulative XP (solid) with a dashed projection of the week ahead. */
export function XpForecastChart({ series }: { series: ForecastPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#15203a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 10 }}
            interval={3}
            tickLine={false}
            axisLine={{ stroke: "#1e2a45" }}
          />
          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: "#0f1626",
              border: "1px solid #1e2a45",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v: number, n: string) => [`${v} XP`, n === "projected" ? "Projected" : "Actual"]}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#38bdf8"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
