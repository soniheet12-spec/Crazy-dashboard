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
