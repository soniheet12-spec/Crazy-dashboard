"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { CelebrationProvider } from "@/components/Celebration";
import { ReminderScheduler } from "@/components/ReminderScheduler";
import { Pwa } from "@/components/Pwa";
import { Onboarding } from "@/components/Onboarding";
import { CommandPalette } from "@/components/CommandPalette";
import { GameStateProvider, useGameState } from "@/lib/gameState";
import { hexToRgbTriplet } from "@/lib/theme";
import { setReduceMotion } from "@/lib/motion";

// Applies the saved accent color to the document as a CSS variable so every
// Tailwind `accent` utility recolors live.
function ThemeApplier() {
  const { state, hydrated } = useGameState();
  const { accent, reduceMotion, theme, fontScale } = state.settings;
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.style.setProperty("--accent-rgb", hexToRgbTriplet(accent));
    root.style.setProperty("--font-scale", String(fontScale ?? 1));
    if (theme && theme !== "dark") root.dataset.theme = theme;
    else delete root.dataset.theme;
    setReduceMotion(reduceMotion);
  }, [accent, reduceMotion, theme, fontScale, hydrated]);
  return null;
}

// Provider order: Celebration + Toast must wrap GameState (the game-state hook
// fires both). SessionProvider wraps everything for calendar auth.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CelebrationProvider>
        <ToastProvider>
          <GameStateProvider>
            <ThemeApplier />
            <ReminderScheduler />
            <Pwa />
            <Onboarding />
            <CommandPalette />
            {children}
          </GameStateProvider>
        </ToastProvider>
      </CelebrationProvider>
    </SessionProvider>
  );
}
