"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { CelebrationProvider } from "@/components/Celebration";
import { ReminderScheduler } from "@/components/ReminderScheduler";
import { Pwa } from "@/components/Pwa";
import { Onboarding } from "@/components/Onboarding";
import { GameStateProvider, useGameState } from "@/lib/gameState";
import { hexToRgbTriplet } from "@/lib/theme";

// Applies the saved accent color to the document as a CSS variable so every
// Tailwind `accent` utility recolors live.
function ThemeApplier() {
  const { state, hydrated } = useGameState();
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.style.setProperty(
      "--accent-rgb",
      hexToRgbTriplet(state.settings.accent),
    );
  }, [state.settings.accent, hydrated]);
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
            {children}
          </GameStateProvider>
        </ToastProvider>
      </CelebrationProvider>
    </SessionProvider>
  );
}
