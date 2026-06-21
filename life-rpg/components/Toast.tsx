"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ArrowUpCircle, Award, Info } from "lucide-react";

export type ToastKind = "xp" | "levelup" | "achievement" | "info";

export interface ToastSpec {
  kind: ToastKind;
  title: string;
  subtitle?: string;
}

interface ActiveToast extends ToastSpec {
  id: number;
}

interface ToastContextValue {
  push: (t: ToastSpec) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, typeof Info> = {
  xp: Sparkles,
  levelup: ArrowUpCircle,
  achievement: Award,
  info: Info,
};

const ACCENTS: Record<ToastKind, string> = {
  xp: "border-accent/40 shadow-glow",
  levelup: "border-amber/50 shadow-glow-amber",
  achievement: "border-amber/50 shadow-glow-amber",
  info: "border-line",
};

const ICON_COLOR: Record<ToastKind, string> = {
  xp: "text-accent",
  levelup: "text-amber",
  achievement: "text-amber",
  info: "text-slate-300",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((t: ToastSpec) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { ...t, id }]);
    // auto-dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, t.kind === "info" ? 2600 : 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.kind];
            const burst = t.kind === "levelup" || t.kind === "achievement";
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: burst ? [0.9, 1.06, 1] : 1,
                }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className={`pointer-events-auto flex items-center gap-3 rounded-xl border bg-bg-card/95 px-4 py-3 backdrop-blur ${ACCENTS[t.kind]}`}
              >
                <motion.div
                  animate={burst ? { rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.6 }}
                  className={ICON_COLOR[t.kind]}
                >
                  <Icon size={22} />
                </motion.div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {t.title}
                  </p>
                  {t.subtitle && (
                    <p className="truncate text-xs text-slate-400">{t.subtitle}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  // Render-safe fallback so the hook never throws if used outside the provider.
  if (!ctx) return { push: () => {} };
  return ctx;
}
