import type { Dungeon, DungeonStage, StatKey } from "./types";

// ─── Dungeons ─────────────────────────────────────────────────────────────────
// Multi-stage objectives cleared one stage at a time. Each stage pays out coins
// + XP when its target is reached; clearing the final stage drops bonus loot.

export const DUNGEON_CLEAR_BONUS = 100; // coins awarded for clearing a whole dungeon

/** Total progress required across every stage. */
export function dungeonTotal(d: Dungeon): number {
  return d.stages.reduce((sum, s) => sum + s.target, 0);
}

/** Progress accumulated across cleared stages + the current stage. */
export function dungeonProgress(d: Dungeon): number {
  const cleared = d.stages.slice(0, d.stageIndex).reduce((sum, s) => sum + s.target, 0);
  return cleared + (d.clearedAt ? 0 : d.progress);
}

/** Overall completion 0–100. */
export function dungeonPct(d: Dungeon): number {
  if (d.clearedAt) return 100;
  const total = dungeonTotal(d);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((dungeonProgress(d) / total) * 100));
}

export interface DungeonPreset {
  name: string;
  stat: StatKey;
  stages: DungeonStage[];
}

export const DUNGEON_PRESETS: DungeonPreset[] = [
  {
    name: "Couch to 5K",
    stat: "body",
    stages: [
      { label: "Week 1 · walk/jog", target: 3, reward: 30 },
      { label: "Week 2 · build base", target: 3, reward: 40 },
      { label: "Week 3 · intervals", target: 3, reward: 50 },
      { label: "Run the 5K", target: 1, reward: 100 },
    ],
  },
  {
    name: "Read 4 Books",
    stat: "mind",
    stages: [
      { label: "Book one", target: 1, reward: 40 },
      { label: "Book two", target: 1, reward: 40 },
      { label: "Book three", target: 1, reward: 40 },
      { label: "Book four", target: 1, reward: 60 },
    ],
  },
  {
    name: "Ship a Side Project",
    stat: "wealth",
    stages: [
      { label: "Scope & plan", target: 5, reward: 40 },
      { label: "Build MVP", target: 20, reward: 80 },
      { label: "Polish", target: 10, reward: 60 },
      { label: "Launch", target: 1, reward: 120 },
    ],
  },
];
