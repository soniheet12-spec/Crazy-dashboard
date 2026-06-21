import type { Stat, StatKey } from "./types";

// ─── Character class & title derivation ───────────────────────────────────────
// Class comes from your dominant stat; title comes from your Character Level.

const CLASS_BY_STAT: Record<string, { name: string; icon: string }> = {
  body: { name: "Warrior", icon: "Swords" },
  mind: { name: "Scholar", icon: "BookOpen" },
  wealth: { name: "Tycoon", icon: "Coins" },
  social: { name: "Diplomat", icon: "Users" },
  discipline: { name: "Monk", icon: "ShieldCheck" },
};

export interface DerivedClass {
  name: string;
  icon: string; // lucide-react icon name
  title: string;
}

function titleForLevel(level: number): string {
  if (level >= 25) return "Legend";
  if (level >= 15) return "Master";
  if (level >= 10) return "Veteran";
  if (level >= 6) return "Adept";
  if (level >= 3) return "Apprentice";
  return "Novice";
}

export function deriveClass(stats: Record<StatKey, Stat>, characterLevel: number): DerivedClass {
  const list = Object.values(stats);
  const title = titleForLevel(characterLevel);

  if (list.length === 0) {
    return { name: "Adventurer", icon: "Compass", title };
  }

  // Dominant stat: highest level, tie-break by XP.
  const dominant = [...list].sort((a, b) => b.level - a.level || b.xp - a.xp)[0];
  const lowest = [...list].sort((a, b) => a.level - b.level || a.xp - b.xp)[0];

  // Balanced build → Polymath.
  if (dominant.level - lowest.level <= 1 && dominant.level >= 3) {
    return { name: "Polymath", icon: "Sparkles", title };
  }

  const klass = CLASS_BY_STAT[dominant.key] ?? { name: "Adventurer", icon: "Compass" };
  return { name: klass.name, icon: klass.icon, title };
}
