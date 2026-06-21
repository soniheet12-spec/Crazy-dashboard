"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { CalendarDays, LogOut, RefreshCw, Check, Award } from "lucide-react";
import { useGameState } from "@/lib/gameState";
import { suggestStat } from "@/lib/calendarMapping";
import { Card, CardTitle, HydrationGate, PageHeader, statColor } from "@/components/ui";
import type { CalendarEvent, CalendarEventsResponse, StatKey } from "@/lib/types";

export default function CalendarPage() {
  const { state, hydrated, completeCalendarEvent, setCalendarMapping } = useGameState();
  const { status: authStatus } = useSession();

  const [data, setData] = useState<CalendarEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState<Record<string, { stat: StatKey; xp: number }>>({});

  const statKeys = useMemo(() => Object.keys(state.stats), [state.stats]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/events", { cache: "no-store" });
      setData((await res.json()) as CalendarEventsResponse);
    } catch {
      setData({ status: "error", message: "Could not reach the server." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // Seed per-event stat/xp choices once events load.
  useEffect(() => {
    if (data?.status !== "ok" || !data.events) return;
    setPicks((prev) => {
      const next = { ...prev };
      for (const e of data.events!) {
        if (!next[e.id]) {
          next[e.id] = {
            stat: state.calendarMappings[e.id] ?? suggestStat(e.title, statKeys),
            xp: 50,
          };
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const awardedIds = new Set(
    state.quests.filter((q) => q.calendarEventId && q.done).map((q) => q.calendarEventId),
  );

  const award = (e: CalendarEvent) => {
    const pick = picks[e.id];
    if (!pick) return;
    completeCalendarEvent(e, pick.stat, pick.xp);
  };

  const setPick = (id: string, patch: Partial<{ stat: StatKey; xp: number }>) => {
    setPicks((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    if (patch.stat) setCalendarMapping(id, patch.stat);
  };

  return (
    <HydrationGate hydrated={hydrated}>
      <PageHeader
        title="Calendar Quests"
        subtitle="Turn your real calendar events into XP-earning quests."
        action={
          data?.status === "ok" ? (
            <div className="flex gap-2">
              <button
                onClick={load}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-300 hover:border-accent hover:text-accent"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={() => signOut({ redirect: false })}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-slate-400 hover:text-body"
              >
                <LogOut size={14} /> Disconnect
              </button>
            </div>
          ) : undefined
        }
      />

      {loading && (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500">Loading calendar…</p>
        </Card>
      )}

      {!loading && data?.status === "not_configured" && (
        <Card>
          <CardTitle>Google Calendar not configured</CardTitle>
          <p className="text-sm leading-relaxed text-slate-400">
            The server has no Google OAuth credentials yet, so calendar features are
            disabled. Everything else in Life RPG works without them. To enable, set{" "}
            <code className="rounded bg-bg-soft px-1.5 py-0.5 text-accent">GOOGLE_CLIENT_ID</code>,{" "}
            <code className="rounded bg-bg-soft px-1.5 py-0.5 text-accent">GOOGLE_CLIENT_SECRET</code>,
            and <code className="rounded bg-bg-soft px-1.5 py-0.5 text-accent">NEXTAUTH_SECRET</code>{" "}
            (see the README), then redeploy.
          </p>
        </Card>
      )}

      {!loading && data?.status === "not_connected" && (
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <CalendarDays className="text-accent" size={36} />
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Connect Google Calendar</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
              Read-only access to your primary calendar. We never write to it. Sign in to
              pull today&apos;s and this week&apos;s events.
            </p>
          </div>
          <button
            onClick={() => signIn("google")}
            className="rounded-lg bg-accent/90 px-5 py-2.5 text-sm font-semibold text-bg hover:bg-accent"
          >
            Connect Google Calendar
          </button>
        </Card>
      )}

      {!loading && data?.status === "error" && (
        <Card>
          <CardTitle>Couldn&apos;t load events</CardTitle>
          <p className="text-sm text-slate-400">{data.message ?? "Unknown error."}</p>
          <button
            onClick={() => signIn("google")}
            className="mt-4 rounded-lg border border-line px-4 py-2 text-sm text-slate-200 hover:border-accent"
          >
            Reconnect
          </button>
        </Card>
      )}

      {!loading && data?.status === "ok" && (
        <Card>
          <CardTitle>Upcoming (next 7 days)</CardTitle>
          {(data.events?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No upcoming events found on your primary calendar.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.events!.map((e) => {
                const awarded = awardedIds.has(e.id);
                const pick = picks[e.id] ?? { stat: statKeys[0], xp: 50 };
                const when = new Date(e.start).toLocaleString(undefined, {
                  weekday: "short",
                  hour: e.allDay ? undefined : "numeric",
                  minute: e.allDay ? undefined : "2-digit",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-line/70 bg-bg-soft/60 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-100">{e.title}</p>
                      <p className="text-[11px] text-slate-500">{when}</p>
                    </div>

                    {awarded ? (
                      <span className="flex items-center gap-1.5 text-sm text-wealth">
                        <Check size={15} /> Awarded
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={pick.stat}
                          onChange={(ev) => setPick(e.id, { stat: ev.target.value })}
                          className="rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-accent"
                          style={{ color: state.stats[pick.stat]?.color ?? statColor(pick.stat) }}
                        >
                          {Object.values(state.stats).map((s) => (
                            <option key={s.key} value={s.key} className="text-slate-100">
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={pick.xp}
                          onChange={(ev) => setPick(e.id, { xp: Number(ev.target.value) })}
                          className="tabular w-16 rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-accent"
                          aria-label="XP reward"
                        />
                        <button
                          onClick={() => award(e)}
                          className="flex items-center gap-1 rounded-lg bg-accent/90 px-2.5 py-1.5 text-xs font-semibold text-bg hover:bg-accent"
                        >
                          <Award size={13} /> Done
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </HydrationGate>
  );
}
