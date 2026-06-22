import type { Difficulty, StatKey } from "./types";

// One-tap routine bundles and boss-goal templates. Stat keys map onto the
// defaults; if a stat was removed, the add actions fall back to the first stat.

export interface RoutinePreset {
  name: string;
  quests: { title: string; stat: StatKey; xp: number; difficulty?: Difficulty }[];
}

export const ROUTINES: RoutinePreset[] = [
  {
    name: "Morning",
    quests: [
      { title: "Make your bed", stat: "discipline", xp: 15 },
      { title: "Morning workout", stat: "body", xp: 50 },
      { title: "Plan the day", stat: "discipline", xp: 20 },
      { title: "Healthy breakfast", stat: "body", xp: 20 },
    ],
  },
  {
    name: "Workday",
    quests: [
      { title: "Deep work block (90 min)", stat: "mind", xp: 60, difficulty: "hard" },
      { title: "Inbox zero", stat: "wealth", xp: 30 },
      { title: "One outreach message", stat: "wealth", xp: 40 },
    ],
  },
  {
    name: "Evening",
    quests: [
      { title: "Read 20 pages", stat: "mind", xp: 30 },
      { title: "Connect with someone", stat: "social", xp: 30 },
      { title: "Reflect & journal", stat: "discipline", xp: 20 },
      { title: "Rest & recharge", stat: "discipline", xp: 20 },
    ],
  },
];

export interface BossPreset {
  title: string;
  stat: StatKey;
  target: number;
  unit: string;
}

export const BOSS_PRESETS: BossPreset[] = [
  { title: "Run a Marathon", stat: "body", target: 42, unit: "km long-run" },
  { title: "Read 24 Books", stat: "mind", target: 24, unit: "books" },
  { title: "Raise a Round", stat: "wealth", target: 100, unit: "% to close" },
  { title: "Network of 100", stat: "social", target: 100, unit: "connections" },
  { title: "100-Day Meditation", stat: "discipline", target: 100, unit: "days" },
];
