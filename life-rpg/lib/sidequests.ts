import type { StatKey } from "./types";

// A rotating pool of bite-sized side quests. One is offered per day,
// chosen deterministically from the date so it's stable across reloads.
const TEMPLATES: { title: string; stat: StatKey; xp: number }[] = [
  { title: "Take a brisk 20-minute walk", stat: "body", xp: 30 },
  { title: "Drink a full glass of water now", stat: "body", xp: 15 },
  { title: "Read 10 pages of a book", stat: "mind", xp: 30 },
  { title: "Learn one new thing and note it", stat: "mind", xp: 25 },
  { title: "Reach out to an old friend", stat: "social", xp: 35 },
  { title: "Give someone a genuine compliment", stat: "social", xp: 20 },
  { title: "Review your finances for 10 minutes", stat: "wealth", xp: 30 },
  { title: "Send one outreach / follow-up message", stat: "wealth", xp: 40 },
  { title: "Tidy your workspace for 5 minutes", stat: "discipline", xp: 20 },
  { title: "Plan tomorrow's top 3 tasks", stat: "discipline", xp: 25 },
  { title: "Do 2 minutes of deep breathing", stat: "discipline", xp: 15 },
  { title: "Stretch for 5 minutes", stat: "body", xp: 20 },
];

function hashDay(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic side quest for a given day, mapped onto available stats. */
export function sideQuestForDay(
  dateStr: string,
  available: StatKey[],
): { title: string; stat: StatKey; xp: number } {
  const base = TEMPLATES[hashDay(dateStr) % TEMPLATES.length];
  const stat = available.includes(base.stat) ? base.stat : available[0] ?? base.stat;
  return { title: base.title, stat, xp: base.xp };
}
