"use client";

import { useEffect, useRef } from "react";
import { useGameState } from "@/lib/gameState";
import { localDay } from "@/lib/dates";

/**
 * Best-effort daily reminder. While the app is open, fires a browser
 * notification at the configured hour if any dailies are still pending.
 */
export function ReminderScheduler() {
  const { state, hydrated } = useGameState();
  const notifiedRef = useRef("");

  useEffect(() => {
    if (!hydrated) return;
    const hour = state.settings.reminderHour;
    if (hour === null || typeof window === "undefined" || !("Notification" in window)) return;

    const tick = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const today = localDay(now);
      if (now.getHours() !== hour || notifiedRef.current === today) return;
      const pending = state.quests.filter((q) => q.daily && !q.negative && !q.done).length;
      if (pending > 0) {
        notifiedRef.current = today;
        try {
          new Notification("Life RPG", {
            body: `You have ${pending} quest${pending > 1 ? "s" : ""} left today — keep your streak alive!`,
          });
        } catch {
          /* ignore */
        }
      }
    };

    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hydrated, state.settings.reminderHour, state.quests]);

  return null;
}
