"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Zap, Trophy, Flame, Sparkles } from "lucide-react";
import { useGameState } from "@/lib/gameState";

const STEPS = [
  { icon: Zap, text: "Log quests to earn XP and level up five life stats." },
  { icon: Flame, text: "Build streaks and combos for big XP multipliers." },
  { icon: Trophy, text: "Defeat boss goals, unlock achievements, and collect loot." },
  { icon: Sparkles, text: "Spend skill points on perks and equip gear for bonuses." },
];

/** First-run intro modal. Shown once until the user taps Start. */
export function Onboarding() {
  const { state, hydrated, setOnboarded } = useGameState();
  const show = hydrated && !state.onboarded;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/85 p-4 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="card w-full max-w-md p-6 text-center"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
              <Swords size={28} />
            </div>
            <p className="font-pixel text-[11px] text-accent">WELCOME TO</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-100">Life RPG</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your goals and habits, as a video-game character sheet.
            </p>

            <ul className="my-5 flex flex-col gap-3 text-left">
              {STEPS.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-soft text-accent">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm text-slate-300">{text}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={setOnboarded}
              className="w-full rounded-lg bg-accent/90 px-4 py-2.5 text-sm font-semibold text-bg hover:bg-accent"
            >
              Start playing
            </button>
            <p className="mt-3 text-xs text-slate-500">
              We&apos;ve loaded sample data so nothing&apos;s empty — clear it anytime in Settings.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
