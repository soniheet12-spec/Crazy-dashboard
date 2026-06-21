"use client";

import type { XpHistoryPoint } from "@/lib/types";
import { localDay, addDays, shortLabel } from "@/lib/dates";

const WEEKS = 12;
const DAYS = WEEKS * 7;

function intensityClass(xp: number): string {
  if (xp <= 0) return "bg-bg-soft";
  if (xp < 40) return "bg-accent/25";
  if (xp < 90) return "bg-accent/50";
  if (xp < 150) return "bg-accent/75";
  return "bg-accent";
}

export function ActivityHeatmap({ history }: { history: XpHistoryPoint[] }) {
  const byDate = new Map(history.map((h) => [h.date, h.xp]));
  const today = localDay();
  // Start so that the grid ends on today; align to whole weeks.
  const start = addDays(today, -(DAYS - 1));

  // Columns = weeks, each with 7 day cells.
  const columns: { date: string; xp: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: string; xp: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      col.push({ date, xp: byDate.get(date) ?? 0 });
    }
    columns.push(col);
  }

  const activeDays = history.filter((h) => h.xp > 0).length;

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.date}
                title={`${shortLabel(cell.date)} · ${cell.xp} XP`}
                className={`h-3.5 w-3.5 rounded-[3px] ${intensityClass(cell.xp)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>{activeDays} active days logged</span>
        <span className="flex items-center gap-1">
          Less
          <span className="h-3 w-3 rounded-[3px] bg-bg-soft" />
          <span className="h-3 w-3 rounded-[3px] bg-accent/25" />
          <span className="h-3 w-3 rounded-[3px] bg-accent/50" />
          <span className="h-3 w-3 rounded-[3px] bg-accent/75" />
          <span className="h-3 w-3 rounded-[3px] bg-accent" />
          More
        </span>
      </div>
    </div>
  );
}
