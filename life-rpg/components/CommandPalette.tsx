"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useGameState } from "@/lib/gameState";

interface Cmd {
  label: string;
  run: () => void;
}

/** Global ⌘K / Ctrl-K command palette for quick navigation + actions. */
export function CommandPalette() {
  const router = useRouter();
  const { claimDailyBonus, acceptSideQuest } = useGameState();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands: Cmd[] = useMemo(
    () => [
      { label: "Go to Dashboard", run: () => router.push("/") },
      { label: "Go to Quests", run: () => router.push("/quests") },
      { label: "Go to Planner", run: () => router.push("/planner") },
      { label: "Go to Calendar", run: () => router.push("/calendar") },
      { label: "Go to Achievements", run: () => router.push("/achievements") },
      { label: "Go to Bosses", run: () => router.push("/bosses") },
      { label: "Go to Skills & Loot", run: () => router.push("/skills") },
      { label: "Go to Insights", run: () => router.push("/insights") },
      { label: "Go to Settings", run: () => router.push("/settings") },
      { label: "Claim daily bonus", run: () => claimDailyBonus() },
      { label: "Accept side quest", run: () => acceptSideQuest() },
    ],
    [router, claimDailyBonus, acceptSideQuest],
  );

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
  const exec = (c: Cmd) => {
    c.run();
    setOpen(false);
    setQ("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-bg/70 p-4 pt-[15vh] backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="card w-full max-w-md overflow-hidden p-0"
            initial={{ scale: 0.96, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Search size={16} className="text-slate-500" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type a command…"
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filtered[0]) exec(filtered[0]);
                }}
              />
            </div>
            <ul className="max-h-72 overflow-y-auto py-2">
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-sm text-slate-500">No commands</li>
              )}
              {filtered.map((c, i) => (
                <li key={i}>
                  <button
                    onClick={() => exec(c)}
                    className="flex w-full items-center px-4 py-2 text-left text-sm text-slate-200 hover:bg-bg-hover"
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
