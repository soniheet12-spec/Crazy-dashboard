// ─── Seasonal / holiday events ────────────────────────────────────────────────
// Purely date-derived (no persisted state). While an event is active every XP
// gain is boosted and the dashboard shows a themed banner.

export interface SeasonalEvent {
  id: string;
  name: string;
  blurb: string;
  icon: string; // must exist in components/Icon registry
  xpMult: number; // applied to every XP gain while active
  accent?: string; // optional accent override suggestion (hex)
}

interface EventWindow extends SeasonalEvent {
  /** Inclusive month (1-12) + day range the event is active. */
  from: [number, number];
  to: [number, number];
}

const EVENTS: EventWindow[] = [
  {
    id: "new-year",
    name: "New Year Surge",
    blurb: "Fresh-start energy — every action earns 50% bonus XP.",
    icon: "Sparkles",
    xpMult: 1.5,
    accent: "#fbbf24",
    from: [1, 1],
    to: [1, 3],
  },
  {
    id: "valentines",
    name: "Heart's Day",
    blurb: "Show your goals some love — +25% XP today.",
    icon: "Heart",
    xpMult: 1.25,
    accent: "#fb7185",
    from: [2, 13],
    to: [2, 15],
  },
  {
    id: "summer-solstice",
    name: "Summer Solstice",
    blurb: "Longest days of the year — soak up +25% XP.",
    icon: "Sunrise",
    xpMult: 1.25,
    accent: "#fb923c",
    from: [6, 20],
    to: [6, 22],
  },
  {
    id: "halloween",
    name: "Spooky Grind",
    blurb: "Banish the bad habits — +30% XP through the night.",
    icon: "Flame",
    xpMult: 1.3,
    accent: "#fb923c",
    from: [10, 30],
    to: [10, 31],
  },
  {
    id: "winter-festival",
    name: "Winter Festival",
    blurb: "Season of giving — every quest pays out 50% more XP.",
    icon: "Snowflake",
    xpMult: 1.5,
    accent: "#38bdf8",
    from: [12, 24],
    to: [12, 31],
  },
];

function inWindow(month: number, day: number, from: [number, number], to: [number, number]): boolean {
  const v = month * 100 + day;
  return v >= from[0] * 100 + from[1] && v <= to[0] * 100 + to[1];
}

/** The seasonal event active on the given date, if any. */
export function activeEvent(d: Date = new Date()): SeasonalEvent | null {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  for (const e of EVENTS) {
    if (inWindow(month, day, e.from, e.to)) {
      const { from: _f, to: _t, ...event } = e;
      return event;
    }
  }
  return null;
}

/** XP multiplier from any active seasonal event (1 when none). */
export function eventMultiplier(d: Date = new Date()): number {
  return activeEvent(d)?.xpMult ?? 1;
}
