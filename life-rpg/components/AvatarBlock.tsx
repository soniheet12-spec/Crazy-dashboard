"use client";

import { motion } from "framer-motion";
import { Flame, Zap, Star, Coins, Heart } from "lucide-react";
import { Icon } from "./Icon";
import type { DerivedClass } from "@/lib/classes";

export function AvatarBlock({
  characterLevel,
  totalXp,
  streakCurrent,
  energyPct,
  klass,
  coins,
  prestige,
  hp,
}: {
  characterLevel: number;
  totalXp: number;
  streakCurrent: number;
  energyPct: number;
  klass: DerivedClass;
  coins: number;
  prestige: number;
  hp: number;
}) {
  return (
    <div className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      {/* Avatar / level medallion */}
      <motion.div
        className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-accent/40 bg-gradient-to-br from-bg-soft to-bg-card shadow-glow sm:mx-0"
        animate={{ boxShadow: ["0 0 24px -8px rgba(56,189,248,0.4)", "0 0 36px -6px rgba(56,189,248,0.6)", "0 0 24px -8px rgba(56,189,248,0.4)"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Star className="absolute -right-2 -top-2 text-amber" size={20} fill="#fbbf24" />
        <div className="text-center">
          <p className="font-pixel text-[9px] text-slate-500">LEVEL</p>
          <p className="tabular text-4xl font-bold text-slate-100">{characterLevel}</p>
        </div>
      </motion.div>

      <div className="flex-1">
        <p className="font-pixel text-[10px] text-accent">CHARACTER SHEET</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Icon name={klass.icon} size={18} />
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            {klass.title} <span className="text-accent">{klass.name}</span>
          </h2>
        </div>
        {prestige > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber">
            <Star size={11} fill="#fbbf24" /> Prestige {prestige} · +{prestige * 2}% XP
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Zap size={15} className="text-accent" />
            <span className="tabular font-semibold text-slate-100">{totalXp.toLocaleString()}</span>
            <span className="text-slate-500">total XP</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Flame size={15} className={streakCurrent > 0 ? "text-amber" : "text-slate-600"} />
            <span className="tabular font-semibold text-slate-100">{streakCurrent}</span>
            <span className="text-slate-500">day streak</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Coins size={15} className="text-amber" />
            <span className="tabular font-semibold text-slate-100">{coins.toLocaleString()}</span>
            <span className="text-slate-500">coins</span>
          </span>
        </div>

        {/* HP bar */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-400">
              <Heart size={12} className="text-body" /> HP
            </span>
            <span className="tabular text-slate-300">{hp}/100</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-bg-soft">
            <motion.div
              className="h-full rounded-full bg-body"
              initial={{ width: 0 }}
              animate={{ width: `${hp}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* Energy bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Energy</span>
            <span className="tabular text-slate-300">{energyPct}/100</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-bg-soft">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-dim to-amber"
              initial={{ width: 0 }}
              animate={{ width: `${energyPct}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
