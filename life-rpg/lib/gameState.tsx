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
import { useCelebration, type CelebrationSpec } from "@/components/Celebration";
import { emptyState, sampleState, STATE_VERSION, DEFAULT_ACCENT } from "./seed";
import { evaluateAchievements } from "./achievements";
import { levelFromXp, streakMultiplier } from "./leveling";
import { localDay, dayDiff, addDays } from "./dates";
import { comboActive, comboMultiplier } from "./combo";
import { PERKS, perkCost, perkLootChanceBonus, perkXpMultiplier } from "./perks";
import { rollBossLoot, rollQuestLoot } from "./loot";
import {
  coinsForXp,
  nextRarity,
  potionMultiplier,
  prestigeMultiplier,
  POTION_MINUTES,
  SHOP_ITEMS,
} from "./shop";
import { collectionBonus, gearMultiplier, MAX_EQUIPPED } from "./gear";
import {
  DAILY_CHALLENGE,
  WEEKLY_CHALLENGE,
  dailyChallengeProgress,
  weeklyChallengeProgress,
  difficultyMult,
  weekKey,
  MAX_HP,
} from "./gameplay";
import { sideQuestForDay } from "./sidequests";
import { playFx, vibrate, type Fx } from "./sound";
import type {
  BossGoal,
  CalendarEvent,
  GameSettings,
  GameState,
  Difficulty,
  Quest,
  QuestTemplate,
  Rarity,
  Stat,
  StatKey,
  SubTask,
} from "./types";

/** Effective base XP after difficulty scaling. */
function effXp(quest: Quest): number {
  return Math.max(1, Math.round(quest.xp * difficultyMult(quest.difficulty)));
}

const REST_RE = /rest|recharge|sleep|heal|nap|meditat/i;

/** Play sound + haptics for an event, respecting user settings. */
function fx(state: GameState, kind: Fx) {
  if (state.settings.sound) playFx(kind);
  if (state.settings.haptics) {
    vibrate(kind === "boss" ? [20, 40, 20] : kind === "levelup" ? [15, 30, 15] : 15);
  }
}

const STORAGE_KEY = "life-rpg:v1";

export interface NewQuestInput {
  title: string;
  stat: StatKey;
  xp: number;
  daily?: boolean;
  negative?: boolean;
  days?: number[];
  subtasks?: string[];
  difficulty?: Difficulty;
}

export interface NewBossInput {
  title: string;
  stat: StatKey;
  target: number;
  unit: string;
  deadline?: string;
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
  // progression
  claimDailyBonus: () => void;
  buyPerk: (perkId: string) => void;
  logFocus: (minutes: number) => void;
  // gear & extras
  equipItem: (id: string) => void;
  unequipItem: (id: string) => void;
  toggleSubtask: (questId: string, subId: string) => void;
  acceptSideQuest: () => void;
  setOnboarded: () => void;
  buyShopItem: (id: string) => void;
  craft: (rarity: Rarity) => void;
  prestige: () => void;
  claimDailyChallenge: () => void;
  claimWeeklyChallenge: () => void;
  respecPerks: () => void;
  addTemplate: (t: Omit<QuestTemplate, "id">) => void;
  removeTemplate: (id: string) => void;
  // stats / settings
  addStat: (label: string) => void;
  renameStat: (key: StatKey, label: string) => void;
  removeStat: (key: StatKey) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  setAccent: (hex: string) => void;
  setReminderHour: (hour: number | null) => void;
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
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function slugifyStatKey(label: string, existing: StatKey[]): StatKey {
  const base =
    label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "stat";
  let key = base;
  let i = 2;
  while (existing.includes(key)) key = `${base}-${i++}`;
  return key;
}

function addToHistory(state: GameState, gained: number) {
  const today = localDay();
  const point = state.xpHistory.find((p) => p.date === today);
  if (point) point.xp += gained;
  else state.xpHistory.push({ date: today, xp: gained });
  if (state.xpHistory.length > 400) state.xpHistory = state.xpHistory.slice(-400);
}

function touchStreak(state: GameState) {
  const today = localDay();
  const last = state.streak.lastActiveDate;
  if (last === today) return;
  if (last && dayDiff(last, today) === 1) state.streak.current += 1;
  else state.streak.current = 1;
  state.streak.lastActiveDate = today;
  state.streak.longest = Math.max(state.streak.longest, state.streak.current);
}

function bumpCombo(state: GameState) {
  const now = Date.now();
  if (!comboActive(state.combo, now)) state.combo.count = 0;
  state.combo.count += 1;
  state.combo.lastAt = new Date(now).toISOString();
}

function updateHabitStreak(quest: Quest, today: string) {
  if (!quest.habitStreak) quest.habitStreak = { current: 0, best: 0, lastDay: "" };
  const hs = quest.habitStreak;
  if (hs.lastDay === today) return;
  if (hs.lastDay && dayDiff(hs.lastDay, today) === 1) hs.current += 1;
  else hs.current = 1;
  hs.lastDay = today;
  hs.best = Math.max(hs.best, hs.current);
}

function multiplierNote(
  streak: number,
  combo: number,
  perk: number,
  gear: number,
  bonus: number,
): string | undefined {
  const parts: string[] = [];
  if (streak > 1.001) parts.push(`Streak ×${streak}`);
  if (combo > 1.001) parts.push(`Combo ×${combo.toFixed(2)}`);
  if (perk > 1.001) parts.push(`Perks ×${perk.toFixed(2)}`);
  if (gear > 1.001) parts.push(`Gear ×${gear.toFixed(2)}`);
  if (bonus > 1.001) parts.push(`Bonus ×${bonus.toFixed(2)}`);
  return parts.length ? parts.join(" · ") : undefined;
}

/** Award XP with streak × combo × perk multipliers; handle level-ups + loot. */
function gainXp(
  state: GameState,
  statKey: StatKey,
  baseXp: number,
  celebrate: (c: CelebrationSpec) => void,
): ToastSpec[] {
  const stat = state.stats[statKey];
  if (!stat) return [];

  const streakMult = streakMultiplier(state.streak.current, state.settings);
  const comboMult = comboMultiplier(state.combo.count, state.perks);
  const perkMult = perkXpMultiplier(state.perks, statKey);
  const gearMult =
    gearMultiplier(state.equipped, state.inventory) * collectionBonus(state.inventory).mult;
  const bonusMult = potionMultiplier(state) * prestigeMultiplier(state.prestige);
  const total = streakMult * comboMult * perkMult * gearMult * bonusMult;
  const gained = Math.max(1, Math.round(baseXp * total));

  const prevLevel = stat.level;
  stat.xp += gained;
  stat.level = levelFromXp(stat.xp);
  state.coins += coinsForXp(baseXp);
  addToHistory(state, gained);

  const toasts: ToastSpec[] = [
    {
      kind: "xp",
      title: `+${gained} XP · ${stat.label}`,
      subtitle: multiplierNote(streakMult, comboMult, perkMult, gearMult, bonusMult),
    },
  ];

  const levelsGained = stat.level - prevLevel;
  if (levelsGained > 0) {
    state.skillPoints += levelsGained;
    fx(state, "levelup");
    celebrate({
      kind: "levelup",
      title: `${stat.label.toUpperCase()} reached Level ${stat.level}!`,
      subtitle: `+${levelsGained} skill point${levelsGained > 1 ? "s" : ""} earned`,
    });
  }

  // Loot roll
  const item = rollQuestLoot(0.18, perkLootChanceBonus(state.perks));
  if (item) {
    state.inventory.unshift(item);
    fx(state, "loot");
    if (item.rarity === "legendary") {
      celebrate({ kind: "loot", title: item.name, subtitle: "A legendary drop!" });
    } else {
      toasts.push({ kind: "info", title: `Loot: ${item.name}`, subtitle: `${item.rarity} drop` });
    }
  }

  return toasts;
}

function applyDailyReset(state: GameState): boolean {
  const today = localDay();
  if (state.lastDailyReset === today) return false;
  for (const q of state.quests) {
    if ((q.daily || (q.days && q.days.length)) && q.done) {
      q.done = false;
      q.completedAt = undefined;
      if (q.subtasks) q.subtasks.forEach((s) => (s.done = false));
    }
  }
  if (state.streak.lastActiveDate) {
    const gap = dayDiff(state.streak.lastActiveDate, today);
    if (gap > 1) {
      if (gap === 2 && state.streakFreezes > 0) {
        state.streakFreezes -= 1; // a freeze bridges exactly one missed day
        state.streak.lastActiveDate = addDays(today, -1);
      } else {
        state.streak.current = 0;
      }
    }
  }
  state.hp = MAX_HP; // rest restores HP each day
  state.lastDailyReset = today;
  return true;
}

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

/** Fill in fields added in later schema versions so old saves keep working. */
function migrate(s: GameState): GameState {
  s.skillPoints ??= 0;
  s.perks ??= {};
  s.inventory ??= [];
  if (!s.combo) s.combo = { count: 0, lastAt: "" };
  if (s.lastLoginBonus === undefined) s.lastLoginBonus = "";
  s.equipped ??= [];
  s.coins ??= 0;
  s.streakFreezes ??= 0;
  if (s.potionUntil === undefined) s.potionUntil = "";
  s.prestige ??= 0;
  if (typeof s.hp !== "number") s.hp = MAX_HP;
  s.templates ??= [];
  if (s.lastDailyChallenge === undefined) s.lastDailyChallenge = "";
  if (s.lastWeeklyChallenge === undefined) s.lastWeeklyChallenge = "";
  if (s.lastSideQuest === undefined) s.lastSideQuest = "";
  if (s.onboarded === undefined) s.onboarded = true;
  if (!s.settings) {
    s.settings = {
      streak7Multiplier: 1.5,
      streak30Multiplier: 2,
      seasonStartedAt: new Date().toISOString(),
      accent: DEFAULT_ACCENT,
      reminderHour: null,
      sound: true,
      haptics: true,
    };
  }
  if (s.settings.accent === undefined) s.settings.accent = DEFAULT_ACCENT;
  if (s.settings.reminderHour === undefined) s.settings.reminderHour = null;
  if (s.settings.sound === undefined) s.settings.sound = true;
  if (s.settings.haptics === undefined) s.settings.haptics = true;
  return s;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameStateProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();
  const { celebrate } = useCelebration();
  const [state, setState] = useState<GameState>(() => emptyState());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let initial: GameState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        initial = isGameState(parsed) ? parsed : sampleState();
      } else {
        initial = sampleState();
      }
    } catch {
      initial = sampleState();
    }
    migrate(initial);
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

  useEffect(() => {
    if (!hydrated) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [state, hydrated]);

  const commit = useCallback(
    (recipe: (draft: GameState, celebrate: (c: CelebrationSpec) => void) => ToastSpec[] | void) => {
      const draft: GameState = structuredClone(stateRef.current);
      applyDailyReset(draft);
      const celebrations: CelebrationSpec[] = [];
      const toasts = recipe(draft, (c) => celebrations.push(c)) || [];

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
      toasts.forEach((t) => push(t));
      celebrations.forEach((c) => celebrate(c));
    },
    [push, celebrate],
  );

  // ─── Quests ────────────────────────────────────────────────────────────────

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
          negative: q.negative ?? false,
        };
        if (q.days && q.days.length) quest.days = [...q.days].sort();
        if (q.difficulty) quest.difficulty = q.difficulty;
        const subs = (q.subtasks ?? []).map((t) => t.trim()).filter(Boolean);
        if (subs.length) {
          quest.subtasks = subs.map((t) => ({ id: genId("st"), title: t, done: false }));
        }
        d.quests.unshift(quest);
      });
    },
    [commit],
  );

  const completeQuest = useCallback(
    (id: string) => {
      commit((d, cele) => {
        const quest = d.quests.find((q) => q.id === id);
        if (!quest || quest.done) return [];
        quest.done = true;
        quest.completedAt = new Date().toISOString();

        if (quest.negative) {
          const stat = d.stats[quest.stat];
          const toasts: ToastSpec[] = [];
          d.hp = Math.max(0, d.hp - quest.xp); // anti-habits deal HP damage
          if (stat) {
            stat.xp = Math.max(0, stat.xp - quest.xp);
            stat.level = levelFromXp(stat.xp);
            addToHistory(d, -quest.xp);
            toasts.push({
              kind: "info",
              title: `−${quest.xp} XP · ${stat.label}`,
              subtitle: `Anti-habit logged · −${quest.xp} HP`,
            });
          }
          return toasts;
        }

        if (quest.subtasks) quest.subtasks.forEach((s) => (s.done = true));
        touchStreak(d);
        if (quest.daily || (quest.days && quest.days.length)) updateHabitStreak(quest, localDay());
        bumpCombo(d);
        if (REST_RE.test(quest.title)) d.hp = Math.min(MAX_HP, d.hp + 40); // rest heals
        const earned = gainXp(d, quest.stat, effXp(quest), cele);
        fx(d, "complete");
        return earned;
      });
    },
    [commit],
  );

  const uncompleteQuest = useCallback(
    (id: string) => {
      commit((d) => {
        const quest = d.quests.find((q) => q.id === id);
        if (!quest || !quest.done) return [];
        const stat = d.stats[quest.stat];
        if (stat) {
          const delta = quest.negative ? quest.xp : -quest.xp;
          stat.xp = Math.max(0, stat.xp + delta);
          stat.level = levelFromXp(stat.xp);
          addToHistory(d, delta);
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
      commit((d, cele) => {
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
        bumpCombo(d);
        return gainXp(d, quest.stat, quest.xp, cele);
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

  // ─── Bosses ──────────────────────────────────────────────────────────────────

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
        if (b.deadline) boss.deadline = b.deadline;
        d.bosses.push(boss);
      });
    },
    [commit],
  );

  const updateBossProgress = useCallback(
    (id: string, delta: number) => {
      commit((d, cele) => {
        const boss = d.bosses.find((b) => b.id === id);
        if (!boss) return [];
        const wasDone = boss.progress >= boss.target;
        boss.progress = Math.max(0, Math.min(boss.target, boss.progress + delta));
        if (!wasDone && boss.progress >= boss.target) {
          const item = rollBossLoot(perkLootChanceBonus(d.perks));
          d.inventory.unshift(item);
          d.coins += 50;
          fx(d, "boss");
          cele({ kind: "boss", title: `${boss.title} defeated!`, subtitle: `Loot: ${item.name}` });
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

  // ─── Progression ──────────────────────────────────────────────────────────────

  const claimDailyBonus = useCallback(() => {
    commit((d) => {
      const today = localDay();
      if (d.lastLoginBonus === today) return [];
      d.lastLoginBonus = today;
      const stats = Object.values(d.stats);
      if (stats.length === 0) return [];
      const lowest = [...stats].sort((a, b) => a.xp - b.xp)[0];
      const bonus = 40;
      lowest.xp += bonus;
      lowest.level = levelFromXp(lowest.xp);
      addToHistory(d, bonus);
      const toasts: ToastSpec[] = [
        { kind: "xp", title: `Daily Blessing: +${bonus} XP · ${lowest.label}` },
      ];
      const item = rollQuestLoot(1, perkLootChanceBonus(d.perks)); // guaranteed drop
      if (item) {
        d.inventory.unshift(item);
        toasts.push({ kind: "info", title: `Loot: ${item.name}`, subtitle: `${item.rarity} drop` });
      }
      return toasts;
    });
  }, [commit]);

  const buyPerk = useCallback(
    (perkId: string) => {
      commit((d) => {
        const perk = PERKS.find((p) => p.id === perkId);
        if (!perk) return [];
        const rank = d.perks[perkId] ?? 0;
        if (rank >= perk.maxRank) return [];
        const cost = perkCost(rank);
        if (d.skillPoints < cost) return [];
        d.skillPoints -= cost;
        d.perks[perkId] = rank + 1;
        return [
          {
            kind: "info",
            title: `${perk.name} → Rank ${rank + 1}`,
            subtitle: `−${cost} skill point${cost > 1 ? "s" : ""}`,
          },
        ];
      });
    },
    [commit],
  );

  const logFocus = useCallback(
    (minutes: number) => {
      commit((d, cele) => {
        const statKey = d.stats["mind"] ? "mind" : Object.keys(d.stats)[0];
        if (!statKey) return [];
        const quest: Quest = {
          id: genId("focus"),
          title: `Focus session · ${minutes} min`,
          stat: statKey,
          xp: Math.max(5, Math.round(minutes)),
          source: "manual",
          done: true,
          completedAt: new Date().toISOString(),
        };
        d.quests.unshift(quest);
        touchStreak(d);
        bumpCombo(d);
        return gainXp(d, statKey, quest.xp, cele);
      });
    },
    [commit],
  );

  // ─── Gear & extras ───────────────────────────────────────────────────────────

  const equipItem = useCallback(
    (id: string) => {
      commit((d) => {
        if (!d.inventory.some((i) => i.id === id) || d.equipped.includes(id)) return [];
        if (d.equipped.length >= MAX_EQUIPPED) {
          return [
            {
              kind: "info",
              title: "All gear slots full",
              subtitle: `Unequip something first (max ${MAX_EQUIPPED}).`,
            },
          ];
        }
        d.equipped.push(id);
      });
    },
    [commit],
  );

  const unequipItem = useCallback(
    (id: string) => {
      commit((d) => {
        d.equipped = d.equipped.filter((x) => x !== id);
      });
    },
    [commit],
  );

  const toggleSubtask = useCallback(
    (questId: string, subId: string) => {
      commit((d, cele) => {
        const quest = d.quests.find((q) => q.id === questId);
        if (!quest || !quest.subtasks) return [];
        const st = quest.subtasks.find((s) => s.id === subId);
        if (!st) return [];
        st.done = !st.done;
        if (!quest.done && quest.subtasks.every((s) => s.done)) {
          quest.done = true;
          quest.completedAt = new Date().toISOString();
          if (!quest.negative) {
            touchStreak(d);
            if (quest.daily || (quest.days && quest.days.length)) updateHabitStreak(quest, localDay());
            bumpCombo(d);
            if (REST_RE.test(quest.title)) d.hp = Math.min(MAX_HP, d.hp + 40);
            const earned = gainXp(d, quest.stat, effXp(quest), cele);
            fx(d, "complete");
            return earned;
          }
        }
      });
    },
    [commit],
  );

  const acceptSideQuest = useCallback(() => {
    commit((d) => {
      const today = localDay();
      if (d.lastSideQuest === today) return [];
      const keys = Object.keys(d.stats);
      if (keys.length === 0) return [];
      const sq = sideQuestForDay(today, keys);
      d.quests.unshift({
        id: genId("side"),
        title: sq.title,
        stat: d.stats[sq.stat] ? sq.stat : keys[0],
        xp: sq.xp,
        source: "manual",
        done: false,
        sideQuest: true,
      });
      d.lastSideQuest = today;
      return [{ kind: "info", title: "Side quest accepted", subtitle: sq.title }];
    });
  }, [commit]);

  const setOnboarded = useCallback(() => {
    commit((d) => {
      d.onboarded = true;
    });
  }, [commit]);

  const buyShopItem = useCallback(
    (id: string) => {
      commit((d, cele) => {
        const item = SHOP_ITEMS.find((s) => s.id === id);
        if (!item || d.coins < item.cost) return [];
        d.coins -= item.cost;
        if (id === "streak-freeze") {
          d.streakFreezes += 1;
          return [{ kind: "info", title: "Streak Freeze purchased", subtitle: `${d.streakFreezes} in reserve` }];
        }
        if (id === "xp-potion") {
          const base = Math.max(Date.now(), d.potionUntil ? new Date(d.potionUntil).getTime() : 0);
          d.potionUntil = new Date(base + POTION_MINUTES * 60_000).toISOString();
          return [{ kind: "info", title: "XP Potion active", subtitle: `1.5× XP for ${POTION_MINUTES} min` }];
        }
        if (id === "mystery-box") {
          const loot = rollQuestLoot(1, perkLootChanceBonus(d.perks));
          if (loot) {
            d.inventory.unshift(loot);
            if (loot.rarity === "legendary") {
              cele({ kind: "loot", title: loot.name, subtitle: "From a Mystery Box!" });
            }
            return [{ kind: "info", title: `Mystery Box: ${loot.name}`, subtitle: `${loot.rarity} drop` }];
          }
        }
      });
    },
    [commit],
  );

  const craft = useCallback(
    (rarity: Rarity) => {
      commit((d) => {
        const up = nextRarity(rarity);
        if (!up) return [];
        const matches = d.inventory.filter((i) => i.rarity === rarity);
        if (matches.length < 3) return [];
        const removeIds = new Set(matches.slice(0, 3).map((i) => i.id));
        d.inventory = d.inventory.filter((i) => !removeIds.has(i.id));
        d.equipped = d.equipped.filter((id) => !removeIds.has(id));
        d.inventory.unshift({
          id: genId("loot"),
          name: `Crafted ${up.charAt(0).toUpperCase()}${up.slice(1)}`,
          rarity: up,
          icon: "Gem",
          acquiredAt: new Date().toISOString(),
        });
        return [{ kind: "info", title: `Crafted a ${up} item`, subtitle: "3 combined into 1" }];
      });
    },
    [commit],
  );

  const prestige = useCallback(() => {
    commit((d) => {
      const topTierXp = 12000; // Mythic threshold
      const seasonStart = localDay(new Date(d.settings.seasonStartedAt));
      const sXp = d.xpHistory.filter((p) => p.date >= seasonStart).reduce((s, p) => s + Math.max(0, p.xp), 0);
      if (sXp < topTierXp) {
        return [{ kind: "info", title: "Not yet", subtitle: "Reach the Mythic season tier to prestige." }];
      }
      d.prestige += 1;
      d.settings.seasonStartedAt = new Date().toISOString();
      return [{ kind: "levelup", title: `Prestige ${d.prestige}!`, subtitle: `Permanent +${d.prestige * 2}% XP` }];
    });
  }, [commit]);

  const claimDailyChallenge = useCallback(() => {
    commit((d) => {
      const today = localDay();
      if (d.lastDailyChallenge === today || dailyChallengeProgress(d) < DAILY_CHALLENGE.target) return [];
      d.lastDailyChallenge = today;
      d.coins += DAILY_CHALLENGE.reward;
      return [{ kind: "xp", title: `Daily challenge complete!`, subtitle: `+${DAILY_CHALLENGE.reward} coins` }];
    });
  }, [commit]);

  const claimWeeklyChallenge = useCallback(() => {
    commit((d, cele) => {
      const wk = weekKey();
      if (d.lastWeeklyChallenge === wk || weeklyChallengeProgress(d) < WEEKLY_CHALLENGE.target) return [];
      d.lastWeeklyChallenge = wk;
      d.coins += WEEKLY_CHALLENGE.reward;
      const loot = rollQuestLoot(1, perkLootChanceBonus(d.perks));
      const toasts: ToastSpec[] = [
        { kind: "xp", title: "Weekly challenge complete!", subtitle: `+${WEEKLY_CHALLENGE.reward} coins` },
      ];
      if (loot) {
        d.inventory.unshift(loot);
        if (loot.rarity === "legendary") cele({ kind: "loot", title: loot.name, subtitle: "Weekly reward!" });
        else toasts.push({ kind: "info", title: `Loot: ${loot.name}`, subtitle: `${loot.rarity} drop` });
      }
      return toasts;
    });
  }, [commit]);

  const respecPerks = useCallback(() => {
    commit((d) => {
      const cost = 50;
      let refund = 0;
      for (const rank of Object.values(d.perks)) refund += (rank * (rank + 1)) / 2;
      if (refund === 0) return [{ kind: "info", title: "No perks to respec" }];
      if (d.coins < cost) return [{ kind: "info", title: "Need 50 coins to respec" }];
      d.coins -= cost;
      d.perks = {};
      d.skillPoints += refund;
      return [{ kind: "info", title: `Respec complete · +${refund} SP`, subtitle: "−50 coins" }];
    });
  }, [commit]);

  const addTemplate = useCallback(
    (t: Omit<QuestTemplate, "id">) => {
      commit((d) => {
        if (d.templates.some((x) => x.title === t.title && x.stat === t.stat)) return [];
        d.templates.unshift({
          id: genId("tpl"),
          title: t.title,
          stat: t.stat,
          xp: t.xp,
          daily: t.daily,
          difficulty: t.difficulty,
        });
        if (d.templates.length > 12) d.templates = d.templates.slice(0, 12);
        return [{ kind: "info", title: "Saved as template" }];
      });
    },
    [commit],
  );

  const removeTemplate = useCallback(
    (id: string) => {
      commit((d) => {
        d.templates = d.templates.filter((t) => t.id !== id);
      });
    },
    [commit],
  );

  // ─── Stats / settings ──────────────────────────────────────────────────────────

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
        if (Object.keys(d.stats).length <= 1) return [];
        delete d.stats[key];
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

  const setAccent = useCallback(
    (hex: string) => {
      commit((d) => {
        d.settings.accent = hex;
      });
    },
    [commit],
  );

  const setReminderHour = useCallback(
    (hour: number | null) => {
      commit((d) => {
        d.settings.reminderHour = hour;
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
      d.quests = d.quests
        .filter((q) => q.daily)
        .map((q) => ({ ...q, done: false, completedAt: undefined, habitStreak: undefined }));
      d.bosses.forEach((b) => (b.progress = 0));
      d.xpHistory = [];
      d.streak = { current: 0, longest: 0, lastActiveDate: "" };
      d.combo = { count: 0, lastAt: "" };
      d.skillPoints = 0;
      d.perks = {};
      d.settings.seasonStartedAt = new Date().toISOString();
      d.isSampleData = false;
      return [{ kind: "info", title: "New season started", subtitle: "Stats, perks, and history reset. Loot kept." }];
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

  const exportJSON = useCallback(() => JSON.stringify(stateRef.current, null, 2), []);

  const importJSON = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json);
        if (!isGameState(parsed)) return false;
        migrate(parsed);
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
      claimDailyBonus,
      buyPerk,
      logFocus,
      equipItem,
      unequipItem,
      toggleSubtask,
      acceptSideQuest,
      setOnboarded,
      buyShopItem,
      craft,
      prestige,
      claimDailyChallenge,
      claimWeeklyChallenge,
      respecPerks,
      addTemplate,
      removeTemplate,
      addStat,
      renameStat,
      removeStat,
      updateSettings,
      setAccent,
      setReminderHour,
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
      claimDailyBonus,
      buyPerk,
      logFocus,
      equipItem,
      unequipItem,
      toggleSubtask,
      acceptSideQuest,
      setOnboarded,
      buyShopItem,
      craft,
      prestige,
      claimDailyChallenge,
      claimWeeklyChallenge,
      respecPerks,
      addTemplate,
      removeTemplate,
      addStat,
      renameStat,
      removeStat,
      updateSettings,
      setAccent,
      setReminderHour,
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
