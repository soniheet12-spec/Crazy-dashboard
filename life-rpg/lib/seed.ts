import { levelFromXp } from "./leveling";
import { seedAchievements } from "./achievements";
import { localDay, addDays } from "./dates";
import type { GameState, Stat, StatKey } from "./types";

export const STATE_VERSION = 1;

const STAT_META: { key: StatKey; label: string; color: string; icon: string }[] = [
  { key: "body", label: "Body", color: "#f87171", icon: "Dumbbell" },
  { key: "mind", label: "Mind", color: "#a78bfa", icon: "Brain" },
  { key: "wealth", label: "Wealth", color: "#34d399", icon: "Coins" },
  { key: "social", label: "Social", color: "#fb923c", icon: "MessagesSquare" },
  { key: "discipline", label: "Discipline", color: "#38bdf8", icon: "ShieldCheck" },
];

function buildStats(xpByKey: Partial<Record<StatKey, number>>): Record<StatKey, Stat> {
  const stats: Record<StatKey, Stat> = {};
  for (const meta of STAT_META) {
    const xp = xpByKey[meta.key] ?? 0;
    stats[meta.key] = {
      key: meta.key,
      label: meta.label,
      color: meta.color,
      icon: meta.icon,
      xp,
      level: levelFromXp(xp),
    };
  }
  return stats;
}

export const DEFAULT_ACCENT = "#38bdf8";

function defaultSettings() {
  return {
    streak7Multiplier: 1.5,
    streak30Multiplier: 2,
    seasonStartedAt: new Date().toISOString(),
    accent: DEFAULT_ACCENT,
    reminderHour: null,
    sound: true,
    haptics: true,
    reduceMotion: false,
    theme: "dark" as const,
    fontScale: 1,
    mode: "casual" as const,
  };
}

/** A clean, empty character sheet (used after "Clear sample data"). */
export function emptyState(): GameState {
  const today = localDay();
  return {
    stats: buildStats({}),
    quests: [],
    achievements: seedAchievements(),
    streak: { current: 0, longest: 0, lastActiveDate: "" },
    bosses: [],
    xpHistory: [],
    settings: defaultSettings(),
    calendarMappings: {},
    skillPoints: 0,
    perks: {},
    inventory: [],
    combo: { count: 0, lastAt: "" },
    equipped: [],
    coins: 0,
    streakFreezes: 0,
    potionUntil: "",
    prestige: 0,
    hp: 100,
    templates: [],
    lastDailyChallenge: "",
    lastWeeklyChallenge: "",
    streakMilestones: [],
    moods: [],
    lastLoginBonus: "",
    lastSideQuest: "",
    onboarded: true,
    runStartedAt: today,
    runHistory: [],
    isSampleData: false,
    lastDailyReset: today,
    version: STATE_VERSION,
  };
}

let idCounter = 0;
function genId(prefix = "q"): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

/** Pre-populated character sheet shown on first load. */
export function sampleState(): GameState {
  const today = localDay();
  const stats = buildStats({
    body: 1200,
    mind: 1800,
    wealth: 950,
    social: 520,
    discipline: 700,
  });

  const at = (daysAgo: number, hour: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const quests: GameState["quests"] = [
    // Today's dailies (pending)
    { id: genId(), title: "Morning workout", stat: "body", xp: 50, source: "manual", done: false, daily: true },
    { id: genId(), title: "Deep work block (90 min)", stat: "mind", xp: 60, source: "manual", done: false, daily: true },
    { id: genId(), title: "Inbox zero", stat: "wealth", xp: 30, source: "manual", done: false, daily: true },
    { id: genId(), title: "Rest & recharge", stat: "discipline", xp: 20, source: "manual", done: false, daily: true },
    // History (completed)
    { id: genId(), title: "5k run", stat: "body", xp: 70, source: "manual", done: true, completedAt: at(0, 6) },
    { id: genId(), title: "Read 30 pages", stat: "mind", xp: 40, source: "manual", done: true, completedAt: at(1, 21) },
    { id: genId(), title: "Closed pilot deal", stat: "wealth", xp: 120, source: "manual", done: true, completedAt: at(2, 15) },
    { id: genId(), title: "Call with investor", stat: "wealth", xp: 80, source: "manual", done: true, completedAt: at(3, 11) },
    { id: genId(), title: "Dinner with family", stat: "social", xp: 45, source: "manual", done: true, completedAt: at(2, 20) },
  ];

  // Build a plausible 30-day XP history ending today.
  const xpHistory: GameState["xpHistory"] = [];
  const start = addDays(today, -29);
  const pattern = [120, 0, 90, 60, 150, 40, 0, 110, 80, 0, 70, 130, 50, 0, 95, 60, 140, 0, 75, 100, 45, 0, 160, 85, 55, 120, 0, 90, 70, 135];
  for (let i = 0; i < 30; i++) {
    xpHistory.push({ date: addDays(start, i), xp: pattern[i] ?? 0 });
  }

  return {
    stats,
    quests,
    achievements: seedAchievements(),
    streak: { current: 5, longest: 12, lastActiveDate: today },
    bosses: [
      { id: genId("boss"), title: "Raise Seed Round", stat: "wealth", target: 5, progress: 1.2, unit: "₹Cr raised" },
      { id: genId("boss"), title: "Sub-3:30 Marathon", stat: "body", target: 42, progress: 28, unit: "km long-run" },
      { id: genId("boss"), title: "Finish 24 Books", stat: "mind", target: 24, progress: 9, unit: "books" },
    ],
    xpHistory,
    settings: defaultSettings(),
    calendarMappings: {},
    skillPoints: 3,
    perks: {},
    inventory: [
      { id: genId("loot"), name: "Silver Sigil", rarity: "rare", icon: "Medal", acquiredAt: at(2, 15) },
      { id: genId("loot"), name: "Copper Coin", rarity: "common", icon: "Coins", acquiredAt: at(3, 11) },
    ],
    combo: { count: 0, lastAt: "" },
    equipped: [],
    coins: 120,
    streakFreezes: 1,
    potionUntil: "",
    prestige: 0,
    hp: 100,
    templates: [],
    lastDailyChallenge: "",
    lastWeeklyChallenge: "",
    streakMilestones: [],
    moods: [],
    lastLoginBonus: "",
    lastSideQuest: "",
    onboarded: false,
    runStartedAt: today,
    runHistory: [],
    isSampleData: true,
    lastDailyReset: today,
    version: STATE_VERSION,
  };
}
