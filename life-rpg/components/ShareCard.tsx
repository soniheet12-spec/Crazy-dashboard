"use client";

import { useCallback } from "react";
import { Share2 } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { characterLevel, totalXp } from "@/lib/leveling";
import { deriveClass } from "@/lib/classes";
import { statColor } from "@/components/ui";

/** Draws the character sheet to a canvas and downloads it as a PNG (no deps). */
export function ShareCard({ className = "" }: { className?: string }) {
  const { state } = useGameState();

  const draw = useCallback(() => {
    const W = 640;
    const H = 360;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const accent = state.settings.accent || "#38bdf8";
    const cl = characterLevel(state.stats);
    const klass = deriveClass(state.stats, cl);
    const stats = Object.values(state.stats);
    const maxLevel = Math.max(2, ...stats.map((s) => s.level));

    // Background + frame
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1e2a45";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    ctx.fillStyle = accent;
    ctx.font = "bold 14px monospace";
    ctx.fillText("LIFE RPG", 30, 46);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(`${klass.title} ${klass.name}`, 30, 88);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.fillText(
      `Character Level ${cl}  ·  ${totalXp(state.stats).toLocaleString()} XP  ·  ${state.streak.current}-day streak`,
      30,
      114,
    );

    let y = 150;
    for (const s of stats.slice(0, 6)) {
      const color = s.color ?? statColor(s.key);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "13px sans-serif";
      ctx.fillText(s.label, 30, y + 12);
      ctx.fillStyle = "#121a2e";
      ctx.fillRect(150, y, 410, 14);
      ctx.fillStyle = color;
      ctx.fillRect(150, y, 410 * (s.level / maxLevel), 14);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "12px monospace";
      ctx.fillText(`Lv ${s.level}`, 575, y + 12);
      y += 32;
    }

    canvas.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = "life-rpg-card.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [state]);

  return (
    <button
      onClick={draw}
      className={`flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-200 hover:border-accent ${className}`}
    >
      <Share2 size={15} /> Share card
    </button>
  );
}
