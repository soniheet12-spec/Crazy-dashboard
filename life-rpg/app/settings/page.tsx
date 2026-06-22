"use client";

import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  Database,
  Bell,
  Volume2,
  Vibrate,
  Accessibility,
  FileUp,
} from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { characterLevel, totalXp } from "@/lib/leveling";
import { ACCENT_PRESETS } from "@/lib/theme";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";

export default function SettingsPage() {
  const {
    state,
    hydrated,
    addQuest,
    addStat,
    renameStat,
    removeStat,
    updateSettings,
    setAccent,
    setReminderHour,
    resetSeason,
    clearSampleData,
    loadSampleData,
    exportJSON,
    importJSON,
  } = useGameState();

  const [newStat, setNewStat] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const [recap, setRecap] = useState<string | null>(null);
  const [recapMsg, setRecapMsg] = useState<string | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-rpg-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    const text = await file.text();
    if (!importJSON(text)) alert("That file isn't a valid Life RPG save.");
  };

  const doImportCSV = async (file: File) => {
    const text = await file.text();
    const keys = Object.keys(state.stats);
    let n = 0;
    for (const line of text.split(/\r?\n/)) {
      const [title, statRaw, xpRaw] = line.split(",").map((s) => s?.trim());
      if (!title || title.toLowerCase() === "title") continue; // skip blank / header
      const match = Object.values(state.stats).find(
        (s) => s.key === statRaw?.toLowerCase() || s.label.toLowerCase() === statRaw?.toLowerCase(),
      );
      addQuest({ title, stat: match?.key ?? keys[0], xp: Math.max(5, Number(xpRaw) || 30) });
      n++;
    }
    alert(`Imported ${n} quest${n === 1 ? "" : "s"} from CSV.`);
  };

  const generateRecap = async () => {
    setRecapLoading(true);
    setRecap(null);
    setRecapMsg(null);
    const weekAgo = Date.now() - 7 * 86_400_000;
    const quests = state.quests
      .filter((q) => q.done && q.completedAt && new Date(q.completedAt).getTime() >= weekAgo)
      .map((q) => ({
        title: q.title,
        stat: state.stats[q.stat]?.label ?? q.stat,
        xp: q.xp,
        completedAt: q.completedAt,
      }));

    try {
      const res = await fetch("/api/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quests,
          characterLevel: characterLevel(state.stats),
          streak: state.streak.current,
          totalXp: totalXp(state.stats),
        }),
      });
      const json = await res.json();
      if (res.ok && json.recap) setRecap(json.recap);
      else setRecapMsg(json.message ?? "Could not generate a recap.");
    } catch {
      setRecapMsg("Network error generating recap.");
    } finally {
      setRecapLoading(false);
    }
  };

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader title="Settings" subtitle="Tune your stats, multipliers, and data." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Stats */}
        <Card>
          <CardTitle>Stats</CardTitle>
          <div className="flex flex-col gap-2">
            {Object.values(state.stats).map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color ?? statColor(s.key) }}
                />
                <input
                  value={s.label}
                  onChange={(e) => renameStat(s.key, e.target.value)}
                  className="flex-1 rounded-lg border border-line bg-bg-soft px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent"
                />
                <span className="tabular w-16 text-right text-xs text-slate-500">
                  Lv {s.level}
                </span>
                <button
                  onClick={() => removeStat(s.key)}
                  disabled={Object.keys(state.stats).length <= 1}
                  className="text-slate-600 hover:text-body disabled:opacity-30"
                  aria-label={`Remove ${s.label}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={newStat}
              onChange={(e) => setNewStat(e.target.value)}
              placeholder="New stat name"
              className="flex-1 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
            />
            <button
              onClick={() => {
                if (newStat.trim()) {
                  addStat(newStat);
                  setNewStat("");
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-200 hover:border-accent"
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </Card>

        {/* Multipliers */}
        <Card>
          <CardTitle>Streak Multipliers</CardTitle>
          <p className="mb-4 text-sm text-slate-400">
            Bonus XP applied at log time based on your current streak.
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
              7-day streak ×
              <input
                type="number"
                step={0.1}
                min={1}
                value={state.settings.streak7Multiplier}
                onChange={(e) => updateSettings({ streak7Multiplier: Number(e.target.value) })}
                className="tabular w-24 rounded-lg border border-line bg-bg-soft px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
              30-day streak ×
              <input
                type="number"
                step={0.1}
                min={1}
                value={state.settings.streak30Multiplier}
                onChange={(e) => updateSettings({ streak30Multiplier: Number(e.target.value) })}
                className="tabular w-24 rounded-lg border border-line bg-bg-soft px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent"
              />
            </label>
          </div>
        </Card>

        {/* Appearance & reminders */}
        <Card>
          <CardTitle>Appearance &amp; Reminders</CardTitle>
          <p className="mb-2 text-sm text-slate-400">Accent color</p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.hex}
                onClick={() => setAccent(p.hex)}
                title={p.name}
                aria-label={p.name}
                className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${
                  state.settings.accent === p.hex ? "border-slate-100" : "border-transparent"
                }`}
                style={{ backgroundColor: p.hex }}
              />
            ))}
          </div>
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-sm text-slate-400">
              <Bell size={14} /> Daily reminder
            </p>
            <select
              value={state.settings.reminderHour ?? ""}
              onChange={async (e) => {
                const v = e.target.value;
                if (v === "") {
                  setReminderHour(null);
                  return;
                }
                if ("Notification" in window && Notification.permission !== "granted") {
                  try {
                    await Notification.requestPermission();
                  } catch {
                    /* ignore */
                  }
                }
                setReminderHour(Number(v));
              }}
              className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            >
              <option value="">Off</option>
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Best-effort nudge while the app is open if your dailies are unfinished.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-5 border-t border-line/70 pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={state.settings.sound}
                onChange={(e) => updateSettings({ sound: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              <Volume2 size={15} /> Sound effects
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={state.settings.haptics}
                onChange={(e) => updateSettings({ haptics: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              <Vibrate size={15} /> Haptics
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={state.settings.reduceMotion}
                onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              <Accessibility size={15} /> Reduce motion
            </label>
          </div>
        </Card>

        {/* Data */}
        <Card>
          <CardTitle>Data</CardTitle>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={doExport}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-200 hover:border-accent"
            >
              <Download size={15} /> Export JSON
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-200 hover:border-accent"
            >
              <Upload size={15} /> Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => csvRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-200 hover:border-accent"
            >
              <FileUp size={15} /> Import quests (CSV)
            </button>
            <input
              ref={csvRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImportCSV(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-line/70 pt-4">
            {state.isSampleData ? (
              <button
                onClick={clearSampleData}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-300 hover:border-body hover:text-body"
              >
                <Trash2 size={15} /> Clear sample data
              </button>
            ) : (
              <button
                onClick={loadSampleData}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-300 hover:border-accent"
              >
                <Database size={15} /> Load sample data
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Reset the season? Stats, XP, history, and streak go back to zero. Dailies are kept.")) {
                  resetSeason();
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-300 hover:border-body hover:text-body"
            >
              <RefreshCw size={15} /> Reset season
            </button>
          </div>
          {state.isSampleData && (
            <p className="mt-3 text-xs text-amber/80">
              You&apos;re viewing sample data. Clear it to start your own run.
            </p>
          )}
        </Card>

        {/* AI recap (Phase 2) */}
        <Card>
          <CardTitle>AI Weekly Recap</CardTitle>
          <p className="mb-4 text-sm text-slate-400">
            Turn this week&apos;s completed quests into a short RPG-style story. Requires{" "}
            <code className="rounded bg-bg-soft px-1.5 py-0.5 text-accent">ANTHROPIC_API_KEY</code>{" "}
            on the server.
          </p>
          <button
            onClick={generateRecap}
            disabled={recapLoading}
            className="flex items-center gap-1.5 rounded-lg bg-accent/90 px-3 py-2 text-sm font-semibold text-bg hover:bg-accent disabled:opacity-50"
          >
            <Sparkles size={15} />
            {recapLoading ? "Summoning the narrator…" : "Generate weekly recap"}
          </button>
          {recap && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg border border-accent/30 bg-bg-soft/60 p-4 text-sm leading-relaxed text-slate-200">
              {recap}
            </p>
          )}
          {recapMsg && <p className="mt-4 text-sm text-slate-500">{recapMsg}</p>}
        </Card>
      </div>
    </HydrationGate>
  );
}
