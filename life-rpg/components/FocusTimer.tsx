"use client";

import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { Card, CardTitle } from "@/components/ui";

const PRESETS = [15, 25, 50];

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** A Pomodoro timer that awards Mind XP when a focus session completes. */
export function FocusTimer() {
  const { logFocus } = useGameState();
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      setRunning(false);
      logFocus(minutes);
      setRemaining(minutes * 60);
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining, minutes, logFocus]);

  const choose = (m: number) => {
    setMinutes(m);
    setRemaining(m * 60);
    setRunning(false);
  };

  const pct = 1 - remaining / (minutes * 60);

  return (
    <Card>
      <CardTitle>Focus Timer</CardTitle>
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1.5">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => choose(m)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                minutes === m ? "bg-accent/20 text-accent" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>

        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#1e2a45" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgb(var(--accent-rgb))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - pct)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="text-center">
            <Timer size={16} className="mx-auto mb-1 text-slate-500" />
            <span className="tabular text-2xl font-bold text-slate-100">{fmt(remaining)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex items-center gap-1.5 rounded-lg bg-accent/90 px-4 py-2 text-sm font-semibold text-bg hover:bg-accent"
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => choose(minutes)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-300 hover:border-accent"
          >
            <RotateCcw size={15} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-500">
          Finish a session to earn <span className="text-accent">{Math.max(5, minutes)} Mind XP</span>.
        </p>
      </div>
    </Card>
  );
}
