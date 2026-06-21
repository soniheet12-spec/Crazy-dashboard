// ─── Local-date helpers ──────────────────────────────────────────────────────
// All "days" in the game are local-time days so dailies/streaks line up with the
// user's real day boundaries.

/** YYYY-MM-DD for a Date (or now) in local time. */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function fromLocalDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Whole-day difference (b - a), both as YYYY-MM-DD local strings. */
export function dayDiff(a: string, b: string): number {
  const ms = fromLocalDay(b).getTime() - fromLocalDay(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function addDays(s: string, n: number): string {
  const d = fromLocalDay(s);
  d.setDate(d.getDate() + n);
  return localDay(d);
}

/** Short label like "Jun 21". */
export function shortLabel(s: string): string {
  return fromLocalDay(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
