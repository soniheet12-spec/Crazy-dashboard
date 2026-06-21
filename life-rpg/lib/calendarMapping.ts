import type { StatKey } from "./types";

// Keyword → stat auto-suggestion for calendar events. First match wins.
const KEYWORD_RULES: { stat: StatKey; words: string[] }[] = [
  {
    stat: "body",
    words: ["gym", "run", "workout", "yoga", "lift", "sleep", "doctor", "walk", "ride", "swim", "training"],
  },
  {
    stat: "wealth",
    words: ["call", "investor", "deal", "pitch", "finance", "budget", "client", "sales", "revenue", "board", "fundrais", "meeting"],
  },
  {
    stat: "mind",
    words: ["read", "learn", "study", "course", "deep work", "write", "research", "design", "code", "book"],
  },
  {
    stat: "social",
    words: ["dinner", "lunch", "coffee", "party", "friends", "family", "date", "network", "1:1", "catch up", "hangout"],
  },
  {
    stat: "discipline",
    words: ["meditat", "journal", "plan", "review", "habit", "routine", "stretch"],
  },
];

/** Suggest a stat for an event title; falls back to the first stat key given. */
export function suggestStat(title: string, available: StatKey[]): StatKey {
  const lower = title.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (!available.includes(rule.stat)) continue;
    if (rule.words.some((w) => lower.includes(w))) return rule.stat;
  }
  return available[0] ?? "mind";
}
