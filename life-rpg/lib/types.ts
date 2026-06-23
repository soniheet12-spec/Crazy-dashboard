// ─── Core domain types for Life RPG ──────────────────────────────────────────

export type StatKey = string; // default five below, but editable in Settings

export const DEFAULT_STAT_KEYS = [
  "body",
  "mind",
  "wealth",
  "social",
  "discipline",
] as const;

export interface Stat {
  key: StatKey;
  label: string;
  xp: number; // cumulative XP earned in this stat
  level: number; // derived from xp, cached for convenience
  color?: string; // hex, used by charts/bars
  icon?: string; // lucide-react icon name (picked in Settings)
}

export interface HabitStreak {
  current: number;
  best: number;
  lastDay: string; // YYYY-MM-DD of last completion
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Quest {
  id: string;
  title: string;
  stat: StatKey;
  xp: number; // base reward (before streak multiplier)
  source: "manual" | "calendar";
  calendarEventId?: string;
  done: boolean;
  completedAt?: string; // ISO timestamp
  daily?: boolean; // resets each local day
  days?: number[]; // scheduled weekdays (0=Sun..6=Sat); active only on these days
  negative?: boolean; // "anti-habit" / debuff — logging it subtracts XP
  habitStreak?: HabitStreak; // per-daily-quest streak tracking
  subtasks?: SubTask[]; // optional checklist; all-done auto-completes the quest
  sideQuest?: boolean; // generated daily side quest
  difficulty?: Difficulty; // scales XP & coins
  lastLoggedDay?: string; // YYYY-MM-DD an anti-habit was last logged (days-clean)
  wager?: number; // coins staked on completion; pays out 2× when done
}

export interface QuestTemplate {
  id: string;
  title: string;
  stat: StatKey;
  xp: number;
  daily?: boolean;
  difficulty?: Difficulty;
}

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type Difficulty = "easy" | "normal" | "hard";

export interface LootItem {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string; // lucide-react icon name
  acquiredAt: string; // ISO
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string; // ISO
  icon: string; // lucide-react icon name
}

export interface Streak {
  current: number;
  longest: number;
  lastActiveDate: string; // YYYY-MM-DD (local)
}

export interface BossGoal {
  id: string;
  title: string;
  stat: StatKey;
  target: number;
  progress: number;
  unit: string; // e.g. "₹5Cr raised"
  deadline?: string; // YYYY-MM-DD optional target date for pace tracking
}

export interface XpHistoryPoint {
  date: string; // YYYY-MM-DD (local)
  xp: number; // XP earned that day
}

export interface GameSettings {
  // Streak XP multipliers (editable in Settings)
  streak7Multiplier: number; // default 1.5
  streak30Multiplier: number; // default 2
  seasonStartedAt: string; // ISO, used by "reset season"
  accent: string; // hex accent color for theming
  reminderHour: number | null; // local hour (0-23) for a daily nudge, or null = off
  sound: boolean; // sound effects on level-up / loot / boss
  haptics: boolean; // vibration feedback on supported devices
  reduceMotion: boolean; // disable confetti / heavy animations
  theme: ThemeMode; // dark (default) / light / high-contrast
  fontScale: number; // root font-size multiplier (0.9–1.25)
}

export type ThemeMode = "dark" | "light" | "contrast";

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  value: number; // 1-5
}

export interface Combo {
  count: number;
  lastAt: string; // ISO timestamp of the last completion in the combo
}

export interface GameState {
  stats: Record<StatKey, Stat>;
  quests: Quest[];
  achievements: Achievement[];
  streak: Streak;
  bosses: BossGoal[];
  xpHistory: XpHistoryPoint[];
  settings: GameSettings;
  // Calendar event-id -> chosen stat mapping (persisted locally).
  calendarMappings: Record<string, StatKey>;
  // Progression / collectibles
  skillPoints: number; // earned on stat level-ups, spent on perks
  perks: Record<string, number>; // perkId -> rank owned
  inventory: LootItem[]; // collected loot
  equipped: string[]; // equipped loot item ids (gear buffs), max 3
  coins: number; // spendable currency earned from quests/bosses
  streakFreezes: number; // consumables that protect a missed day
  potionUntil: string; // ISO; active XP-potion expiry
  prestige: number; // prestige level (permanent XP bonus)
  hp: number; // 0-100; drained by anti-habits, restored daily / by rest
  templates: QuestTemplate[]; // saved quest templates / favorites
  lastDailyChallenge: string; // YYYY-MM-DD daily challenge claimed
  lastWeeklyChallenge: string; // ISO week key weekly challenge claimed
  streakMilestones: number[]; // claimed streak milestones (7/30/100)
  moods: MoodEntry[]; // daily mood check-ins
  combo: Combo; // momentum meter
  lastLoginBonus: string; // YYYY-MM-DD the daily bonus was last claimed
  lastSideQuest: string; // YYYY-MM-DD the daily side quest was last accepted
  onboarded: boolean; // has the user seen the intro
  comeback?: number; // days away when returning after a gap (drives welcome-back banner)
  // Internal bookkeeping
  isSampleData: boolean; // true until the user clears the seed
  lastDailyReset: string; // YYYY-MM-DD
  version: number; // schema version for safe migrations
}

// ─── Calendar API shapes ─────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end?: string; // ISO
  allDay: boolean;
}

export type CalendarStatus =
  | "not_configured" // no GOOGLE_CLIENT_ID on the server
  | "not_connected" // configured but the user hasn't signed in
  | "error"
  | "ok";

export interface CalendarEventsResponse {
  status: CalendarStatus;
  events?: CalendarEvent[];
  message?: string;
}
