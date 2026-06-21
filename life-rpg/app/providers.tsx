"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { GameStateProvider } from "@/lib/gameState";

// Provider order matters: Toast must wrap GameState (the game-state hook fires
// toasts), and SessionProvider wraps everything so calendar pages can read auth.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <GameStateProvider>{children}</GameStateProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
