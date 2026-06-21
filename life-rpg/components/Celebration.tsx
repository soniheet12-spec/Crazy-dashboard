"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpCircle, Crown, Award, Gem, type LucideIcon } from "lucide-react";

export type CelebrationKind = "levelup" | "boss" | "achievement" | "loot";

export interface CelebrationSpec {
  kind: CelebrationKind;
  title: string;
  subtitle?: string;
}

interface CelebrationContextValue {
  celebrate: (c: CelebrationSpec) => void;
}

const Ctx = createContext<CelebrationContextValue | null>(null);

const ICONS: Record<CelebrationKind, LucideIcon> = {
  levelup: ArrowUpCircle,
  boss: Crown,
  achievement: Award,
  loot: Gem,
};

const CONFETTI = Array.from({ length: 28 });
const COLORS = ["#38bdf8", "#fbbf24", "#a78bfa", "#34d399", "#fb923c", "#f87171"];

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<CelebrationSpec[]>([]);

  const celebrate = useCallback((c: CelebrationSpec) => {
    setQueue((q) => [...q, c]);
    setTimeout(() => setQueue((q) => q.slice(1)), 2800);
  }, []);

  const current = queue[0];
  const Icon = current ? ICONS[current.kind] : ArrowUpCircle;

  return (
    <Ctx.Provider value={{ celebrate }}>
      {children}
      <AnimatePresence>
        {current && (
          <motion.div
            key={queue.length + current.title}
            className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQueue((q) => q.slice(1))}
          >
            {/* Confetti burst */}
            <div className="pointer-events-none absolute left-1/2 top-1/2">
              {CONFETTI.map((_, i) => {
                const angle = (i / CONFETTI.length) * Math.PI * 2;
                const dist = 120 + Math.random() * 180;
                return (
                  <motion.span
                    key={i}
                    className="absolute h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist + 80,
                      opacity: 0,
                      rotate: Math.random() * 360,
                      scale: 0.4,
                    }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                  />
                );
              })}
            </div>

            <motion.div
              className="relative mx-4 flex flex-col items-center gap-3 rounded-2xl border border-amber/50 bg-bg-card/95 px-10 py-8 text-center shadow-glow-amber"
              initial={{ scale: 0.7, y: 20 }}
              animate={{ scale: [0.7, 1.08, 1], y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <motion.div
                className="text-amber"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.25, 1] }}
                transition={{ duration: 0.7 }}
              >
                <Icon size={56} strokeWidth={1.5} />
              </motion.div>
              <p className="font-pixel text-xs text-amber">
                {current.kind === "levelup"
                  ? "LEVEL UP"
                  : current.kind === "boss"
                    ? "BOSS DEFEATED"
                    : current.kind === "loot"
                      ? "LEGENDARY LOOT"
                      : "ACHIEVEMENT"}
              </p>
              <h2 className="max-w-xs text-xl font-bold text-slate-100">{current.title}</h2>
              {current.subtitle && (
                <p className="text-sm text-slate-400">{current.subtitle}</p>
              )}
              <p className="mt-1 text-[11px] text-slate-600">tap to dismiss</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

export function useCelebration(): CelebrationContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) return { celebrate: () => {} };
  return ctx;
}
