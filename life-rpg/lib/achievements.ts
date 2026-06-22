import type { Achievement, GameState } from "./types";

// Seed achievement definitions + their unlock predicates. The `check` runs on
// every state change; once unlocked, an achievement stays unlocked.
interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide-react icon name
  check: (s: GameState) => boolean;
}

const completedQuests = (s: GameState) => s.quests.filter((q) => q.done);

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "early-riser",
    title: "Early Riser",
    description: "Complete 10 quests before 7:00 AM.",
    icon: "Sunrise",
    check: (s) =>
      completedQuests(s).filter((q) => {
        if (!q.completedAt) return false;
        return new Date(q.completedAt).getHours() < 7;
      }).length >= 10,
  },
  {
    id: "closer",
    title: "Closer",
    description: "Complete 3 Wealth quests.",
    icon: "Handshake",
    check: (s) =>
      completedQuests(s).filter((q) => q.stat === "wealth").length >= 3,
  },
  {
    id: "iron-will",
    title: "Iron Will",
    description: "Reach a 30-day streak.",
    icon: "ShieldCheck",
    check: (s) => s.streak.current >= 30 || s.streak.longest >= 30,
  },
  {
    id: "polymath",
    title: "Polymath",
    description: "Get every stat to level 5 or higher.",
    icon: "BrainCircuit",
    check: (s) => {
      const stats = Object.values(s.stats);
      return stats.length > 0 && stats.every((st) => st.level >= 5);
    },
  },
  {
    id: "marathoner",
    title: "Marathoner",
    description: "Complete 100 total quests.",
    icon: "Trophy",
    check: (s) => completedQuests(s).length >= 100,
  },
];

/** Progress toward a (possibly locked) achievement, for progress bars. */
export function achievementProgress(
  s: GameState,
  id: string,
): { current: number; target: number } | null {
  const done = s.quests.filter((q) => q.done);
  switch (id) {
    case "early-riser":
      return {
        current: Math.min(10, done.filter((q) => q.completedAt && new Date(q.completedAt).getHours() < 7).length),
        target: 10,
      };
    case "closer":
      return { current: Math.min(3, done.filter((q) => q.stat === "wealth").length), target: 3 };
    case "iron-will":
      return { current: Math.min(30, Math.max(s.streak.current, s.streak.longest)), target: 30 };
    case "polymath": {
      const stats = Object.values(s.stats);
      return { current: stats.filter((st) => st.level >= 5).length, target: stats.length };
    }
    case "marathoner":
      return { current: Math.min(100, done.length), target: 100 };
    default:
      return null;
  }
}

export function seedAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFS.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    icon: d.icon,
    unlocked: false,
  }));
}

/**
 * Re-evaluate every achievement against current state. Returns the updated
 * achievement list and the ids unlocked *this* call (for toasts).
 */
export function evaluateAchievements(state: GameState): {
  achievements: Achievement[];
  newlyUnlocked: Achievement[];
} {
  const newlyUnlocked: Achievement[] = [];
  const byId = new Map(state.achievements.map((a) => [a.id, a]));

  const achievements: Achievement[] = ACHIEVEMENT_DEFS.map((def) => {
    const existing = byId.get(def.id);
    // Keep already-unlocked achievements unlocked.
    if (existing?.unlocked) return existing;

    const passes = def.check(state);
    if (passes) {
      const unlocked: Achievement = {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlocked: true,
        unlockedAt: new Date().toISOString(),
      };
      newlyUnlocked.push(unlocked);
      return unlocked;
    }
    return (
      existing ?? {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlocked: false,
      }
    );
  });

  return { achievements, newlyUnlocked };
}
