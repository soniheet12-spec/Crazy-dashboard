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
import type { XpHistoryPoint } from "@/lib/types";
import { localDay, addDays, shortLabel } from "@/lib/dates";

/** Build a dense 30-day series (filling missing days with 0). */
function build30Days(history: XpHistoryPoint[]) {
  const byDate = new Map(history.map((h) => [h.date, h.xp]));
  const today = localDay();
  const start = addDays(today, -29);
  const out: { date: string; label: string; xp: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const date = addDays(start, i);
    out.push({ date, label: shortLabel(date), xp: byDate.get(date) ?? 0 });
  }
  return out;
}

export function XpLineChart({ history }: { history: XpHistoryPoint[] }) {
  const data = build30Days(history);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="xpStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#15203a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 10 }}
            interval={6}
            tickLine={false}
            axisLine={{ stroke: "#1e2a45" }}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "#0f1626",
              border: "1px solid #1e2a45",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#7dd3fc" }}
            formatter={(v: number) => [`${v} XP`, "Earned"]}
          />
          <Line
            type="monotone"
            dataKey="xp"
            stroke="url(#xpStroke)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#7dd3fc" }}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
