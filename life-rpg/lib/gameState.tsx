"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast, type ToastSpec } from "@/components/Toast";
import { emptyState, sampleState, STATE_VERSION } from "./seed";
import { evaluateAchievements } from "./achievements";
import { levelFromXp, streakMultiplier } from "./leveling";
import { localDay, dayDiff } from "./dates";
import type {
  BossGoal,
  CalendarEvent,
  GameSettings,
  GameState,
  Quest,
  Stat,
  StatKey,
} from "./types";

const STORAGE_KEY = "life-rpg:v1";

// ─── New-quest input shape ───────────────────────────────────────────────────
export interface NewQuestInput {
  title: string;
  stat: StatKey;
  xp: number;
  daily?: boolean;
}

export interface NewBossInput {
  title: string;
  stat: StatKey;
  target: number;
  unit: string;
}

export interface GameStateContextValue {
  state: GameState;
  hydrated: boolean;
  // quests
  addQuest: (q: NewQuestInput) => void;
  completeQuest: (id: string) => void;
  uncompleteQuest: (id: string) => void;
  removeQuest: (id: string) => void;
  // calendar
  completeCalendarEvent: (e: CalendarEvent, stat: StatKey, xp: number) => void;
  setCalendarMapping: (eventId: string, stat: StatKey) => void;
  // bosses
  addBoss: (b: NewBossInput) => void;
  updateBossProgress: (id: string, delta: number) => void;
  removeBoss: (id: string) => void;
  // stats / settings
  addStat: (label: string) => void;
  renameStat: (key: StatKey, label: string) => void;
  removeStat: (key: StatKey) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  // lifecycle / data
  resetSeason: () => void;
  clearSampleData: () => void;
  loadSampleData: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
}

const Ctx = createContext<GameStateContextValue | null>(null);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function genId(prefix = "q"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function slugifyStatKey(label: string, existing: StatKey[]): StatKey {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "stat";
  let key = base;
  let i = 2;
  while (existing.includes(key)) key = `${base}-${i++}`;
  return key;
}

/** Add `xp` to today's history bucket. */
function addToHistory(state: GameState, gained: number) {
  const today = localDay();
  const point = state.xpHistory.find((p) => p.date === today);
  if (point) point.xp += gained;
  else state.xpHistory.push({ date: today, xp: gained });
  // keep a rolling window large enough for charts/heatmap
  if (state.xpHistory.length > 400) {
    state.xpHistory = state.xpHistory.slice(-400);
  }
}

/** Register activity for today and update the streak. Mutates draft. */
function touchStreak(state: GameState) {
  const today = localDay();
  const last = state.streak.lastActiveDate;
  if (last === today) return; // already counted today
  if (last && dayDiff(last, today) === 1) {
    state.streak.current += 1; // consecutive day
  } else {
    state.streak.current = 1; // first day or streak broken
  }
  state.streak.lastActiveDate = today;
  state.streak.longest = Math.max(state.streak.longest, state.streak.current);
}

/**
 * Award XP to a stat, applying the streak multiplier. Mutates draft and returns
 * the toasts to surface (xp gain + any level-ups).
 */
function awardXp(
  state: GameState,
  statKey: StatKey,
  baseXp: number,
): ToastSpec[] {
  const stat = state.stats[statKey];
  if (!stat) return [];

  const mult = streakMultiplier(state.streak.current, state.settings);
  const gained = Math.round(baseXp * mult);

  const prevLevel = stat.level;
  stat.xp += gained;
  stat.level = levelFromXp(stat.xp);

  addToHistory(state, gained);

  const toasts: ToastSpec[] = [
    {
      kind: "xp",
      title: `+${gained} XP · ${stat.label}`,
      subtitle: mult > 1 ? `Streak bonus ×${mult}` : undefined,
    },
  ];
  if (stat.level > prevLevel) {
    toasts.push({
      kind: "levelup",
      title: `${stat.label.toUpperCase()} reached Level ${stat.level}!`,
      subtitle: "Keep the run going.",
    });
  }
  return toasts;
}

/** Reset dailies and break the streak if a day was fully missed. Mutates draft. */
function applyDailyReset(state: GameState): boolean {
  const today = localDay();
  if (state.lastDailyReset === today) return false;

  for (const q of state.quests) {
    if (q.daily && q.done) {
      q.done = false;
      q.completedAt = undefined;
    }
  }
  // Streak breaks if the last active day is more than one day in the past.
  if (state.streak.lastActiveDate && dayDiff(state.streak.lastActiveDate, today) > 1) {
    state.streak.current = 0;
  }
  state.lastDailyReset = today;
  return true;
}

/** Validate a parsed object looks like a GameState before adopting it. */
function isGameState(v: unknown): v is GameState {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<GameState>;
  return (
    !!s.stats &&
    Array.isArray(s.quests) &&
    Array.isArray(s.achievements) &&
    !!s.streak &&
    Array.isArray(s.bosses) &&
    Array.isArray(s.xpHistory)
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameStateProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();
  const [state, setState] = useState<GameState>(() => emptyState());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount (client only).
  useEffect(() => {
    let initial: GameState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        initial = isGameState(parsed) ? parsed : sampleState();
      } else {
        initial = sampleState(); // first load → seed sample data
      }
    } catch {
      initial = sampleState();
    }
    // Re-derive levels (in case math changed) and run a daily reset.
    for (const k of Object.keys(initial.stats)) {
      initial.stats[k].level = levelFromXp(initial.stats[k].xp);
    }
    applyDailyReset(initial);
    const { achievements } = evaluateAchievements(initial);
    initial.achievements = achievements;
    initial.version = STATE_VERSION;

    setState(initial);
    setHydrated(true);
  }, []);

  // Debounced persistence.
  useEffect(() => {
    if (!hydrated) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch {
        /* storage full / unavailable — ignore */
      }
    }, 400);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [state, hydrated]);

  /**
   * Central commit: clone current state, run the recipe (which mutates the
   * draft and returns toasts), re-evaluate achievements, then commit + notify.
   */
  const commit = useCallback(
    (recipe: (draft: GameState) => ToastSpec[] | void) => {
      const draft: GameState = structuredClone(stateRef.current);
      applyDailyReset(draft);
      const toasts = recipe(draft) || [];

      const { achievements, newlyUnlocked } = evaluateAchievements(draft);
      draft.achievements = achievements;
      for (const a of newlyUnlocked) {
        toasts.push({
          kind: "achievement",
          title: `Achievement unlocked: ${a.title}`,
          subtitle: a.description,
        });
      }

      stateRef.current = draft;
      setState(draft);
      // Surface toasts after the state commit.
      toasts.forEach((t) => push(t));
    },
    [push],
  );

  // ─── Actions ────────────────────────────────────────────────────────────────

  const addQuest = useCallback(
    (q: NewQuestInput) => {
      commit((d) => {
        const quest: Quest = {
          id: genId(),
          title: q.title.trim() || "Untitled quest",
          stat: d.stats[q.stat] ? q.stat : Object.keys(d.stats)[0],
          xp: Math.max(0, Math.round(q.xp)),
          source: "manual",
          done: false,
          daily: q.daily ?? false,
        };
        d.quests.unshift(quest);
      });
    },
    [commit],
  );

  const completeQuest = useCallback(
    (id: string) => {
      commit((d) => {
        const quest = d.quests.find((q) => q.id === id);
        if (!quest || quest.done) return [];
        quest.done = true;
        quest.completedAt = new Date().toISOString();
        touchStreak(d);
        return awardXp(d, quest.stat, quest.xp);
      });
    },
    [commit],
  );

  const uncompleteQuest = useCallback(
    (id: string) => {
      commit((d) => {
        const quest = d.quests.find((q) => q.id === id);
        if (!quest || !quest.done) return [];
        // Roll back the XP that was awarded (best-effort, no multiplier history).
        const stat = d.stats[quest.stat];
        if (stat) {
          stat.xp = Math.max(0, stat.xp - quest.xp);
          stat.level = levelFromXp(stat.xp);
          addToHistory(d, -quest.xp);
        }
        quest.done = false;
        quest.completedAt = undefined;
      });
    },
    [commit],
  );

  const removeQuest = useCallback(
    (id: string) => {
      commit((d) => {
        d.quests = d.quests.filter((q) => q.id !== id);
      });
    },
    [commit],
  );

  const completeCalendarEvent = useCallback(
    (e: CalendarEvent, stat: StatKey, xp: number) => {
      commit((d) => {
        // Avoid double-awarding the same event.
        if (d.quests.some((q) => q.calendarEventId === e.id && q.done)) return [];
        const quest: Quest = {
          id: genId("cal"),
          title: e.title,
          stat: d.stats[stat] ? stat : Object.keys(d.stats)[0],
          xp: Math.max(0, Math.round(xp)),
          source: "calendar",
          calendarEventId: e.id,
          done: true,
          completedAt: new Date().toISOString(),
        };
        d.quests.unshift(quest);
        d.calendarMappings[e.id] = quest.stat;
        touchStreak(d);
        return awardXp(d, quest.stat, quest.xp);
      });
    },
    [commit],
  );

  const setCalendarMapping = useCallback(
    (eventId: string, stat: StatKey) => {
      commit((d) => {
        d.calendarMappings[eventId] = stat;
      });
    },
    [commit],
  );

  const addBoss = useCallback(
    (b: NewBossInput) => {
      commit((d) => {
        const boss: BossGoal = {
          id: genId("boss"),
          title: b.title.trim() || "New Boss",
          stat: d.stats[b.stat] ? b.stat : Object.keys(d.stats)[0],
          target: Math.max(1, b.target),
          progress: 0,
          unit: b.unit.trim(),
        };
        d.bosses.push(boss);
      });
    },
    [commit],
  );

  const updateBossProgress = useCallback(
    (id: string, delta: number) => {
      commit((d) => {
        const boss = d.bosses.find((b) => b.id === id);
        if (!boss) return [];
        boss.progress = Math.max(0, Math.min(boss.target, boss.progress + delta));
        if (boss.progress >= boss.target) {
          return [
            {
              kind: "levelup",
              title: `Boss defeated: ${boss.title}!`,
              subtitle: "Goal complete.",
            },
          ];
        }
      });
    },
    [commit],
  );

  const removeBoss = useCallback(
    (id: string) => {
      commit((d) => {
        d.bosses = d.bosses.filter((b) => b.id !== id);
      });
    },
    [commit],
  );

  const addStat = useCallback(
    (label: string) => {
      commit((d) => {
        const key = slugifyStatKey(label, Object.keys(d.stats));
        const palette = ["#f87171", "#a78bfa", "#34d399", "#fb923c", "#38bdf8", "#e879f9", "#facc15"];
        const stat: Stat = {
          key,
          label: label.trim() || key,
          xp: 0,
          level: 1,
          color: palette[Object.keys(d.stats).length % palette.length],
        };
        d.stats[key] = stat;
      });
    },
    [commit],
  );

  const renameStat = useCallback(
    (key: StatKey, label: string) => {
      commit((d) => {
        if (d.stats[key]) d.stats[key].label = label.trim() || key;
      });
    },
    [commit],
  );

  const removeStat = useCallback(
    (key: StatKey) => {
      commit((d) => {
        if (Object.keys(d.stats).length <= 1) return []; // keep at least one
        delete d.stats[key];
        // Reassign orphaned quests/bosses to the first remaining stat.
        const fallback = Object.keys(d.stats)[0];
        d.quests.forEach((q) => {
          if (q.stat === key) q.stat = fallback;
        });
        d.bosses.forEach((b) => {
          if (b.stat === key) b.stat = fallback;
        });
      });
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      commit((d) => {
        d.settings = { ...d.settings, ...patch };
      });
    },
    [commit],
  );

  const resetSeason = useCallback(() => {
    commit((d) => {
      for (const k of Object.keys(d.stats)) {
        d.stats[k].xp = 0;
        d.stats[k].level = 1;
      }
      d.quests = d.quests.filter((q) => q.daily).map((q) => ({ ...q, done: false, completedAt: undefined }));
      d.bosses.forEach((b) => (b.progress = 0));
      d.xpHistory = [];
      d.streak = { current: 0, longest: 0, lastActiveDate: "" };
      d.settings.seasonStartedAt = new Date().toISOString();
      d.isSampleData = false;
      return [{ kind: "info", title: "New season started", subtitle: "Stats and history reset." }];
    });
  }, [commit]);

  const clearSampleData = useCallback(() => {
    const fresh = emptyState();
    stateRef.current = fresh;
    setState(fresh);
    push({ kind: "info", title: "Sample data cleared", subtitle: "Your character sheet is now empty." });
  }, [push]);

  const loadSampleData = useCallback(() => {
    const sample = sampleState();
    stateRef.current = sample;
    setState(sample);
    push({ kind: "info", title: "Sample data loaded" });
  }, [push]);

  const exportJSON = useCallback(() => {
    return JSON.stringify(stateRef.current, null, 2);
  }, []);

  const importJSON = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json);
        if (!isGameState(parsed)) return false;
        for (const k of Object.keys(parsed.stats)) {
          parsed.stats[k].level = levelFromXp(parsed.stats[k].xp);
        }
        const { achievements } = evaluateAchievements(parsed);
        parsed.achievements = achievements;
        parsed.version = STATE_VERSION;
        stateRef.current = parsed;
        setState(parsed);
        push({ kind: "info", title: "Game state imported" });
        return true;
      } catch {
        return false;
      }
    },
    [push],
  );

  const value = useMemo<GameStateContextValue>(
    () => ({
      state,
      hydrated,
      addQuest,
      completeQuest,
      uncompleteQuest,
      removeQuest,
      completeCalendarEvent,
      setCalendarMapping,
      addBoss,
      updateBossProgress,
      removeBoss,
      addStat,
      renameStat,
      removeStat,
      updateSettings,
      resetSeason,
      clearSampleData,
      loadSampleData,
      exportJSON,
      importJSON,
    }),
    [
      state,
      hydrated,
      addQuest,
      completeQuest,
      uncompleteQuest,
      removeQuest,
      completeCalendarEvent,
      setCalendarMapping,
      addBoss,
      updateBossProgress,
      removeBoss,
      addStat,
      renameStat,
      removeStat,
      updateSettings,
      resetSeason,
      clearSampleData,
      loadSampleData,
      exportJSON,
      importJSON,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGameState(): GameStateContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGameState must be used within GameStateProvider");
  return ctx;
}
