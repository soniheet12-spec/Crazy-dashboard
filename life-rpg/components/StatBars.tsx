"use client";

import { motion } from "framer-motion";
import type { Stat } from "@/lib/types";
import { levelProgress } from "@/lib/leveling";
import { statColor } from "./ui";

export function StatBars({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex flex-col gap-4">
      {stats.map((s) => {
        const prog = levelProgress(s.xp);
        const color = s.color ?? statColor(s.key);
        return (
          <div key={s.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">{s.label}</span>
              <span className="tabular text-xs text-slate-400">
                Lv <span className="text-slate-100">{prog.level}</span>
                <span className="mx-1.5 text-slate-600">·</span>
                {prog.xpIntoLevel}/{prog.xpForThisLevel} XP
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-soft">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(prog.pct * 100)}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
