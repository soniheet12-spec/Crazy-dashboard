"use client";

import {
  Sunrise,
  Handshake,
  ShieldCheck,
  BrainCircuit,
  Trophy,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGameState } from "@/lib/gameState";
import { Card, HydrationGate, PageHeader } from "@/components/ui";

const ICONS: Record<string, LucideIcon> = {
  Sunrise,
  Handshake,
  ShieldCheck,
  BrainCircuit,
  Trophy,
};

export default function AchievementsPage() {
  const { state, hydrated } = useGameState();
  const unlockedCount = state.achievements.filter((a) => a.unlocked).length;

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Achievements"
        subtitle={`${unlockedCount} of ${state.achievements.length} unlocked.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.achievements.map((a, i) => {
          const Icon = ICONS[a.icon] ?? Trophy;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={`flex h-full items-start gap-4 ${
                  a.unlocked ? "shadow-glow-amber" : "opacity-60"
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    a.unlocked
                      ? "bg-amber/15 text-amber"
                      : "bg-bg-soft text-slate-600"
                  }`}
                >
                  {a.unlocked ? <Icon size={24} /> : <Lock size={20} />}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold ${a.unlocked ? "text-slate-100" : "text-slate-400"}`}>
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">{a.description}</p>
                  {a.unlocked && a.unlockedAt && (
                    <p className="mt-2 text-[11px] text-amber/80">
                      Unlocked {new Date(a.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </HydrationGate>
  );
}
