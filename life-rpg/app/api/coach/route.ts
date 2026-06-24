import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

// ─── AI weekly coach ───────────────────────────────────────────────────────────
// Turns the player's current standing into a short, actionable focus for the week
// ahead. Gated behind ANTHROPIC_API_KEY — degrades gracefully (501) when not set.

interface CoachBody {
  stats?: { label: string; level: number }[];
  weakest?: string;
  streak?: number;
  recentXp?: number; // XP earned in the last 7 days
  dailyAvg?: number; // recent average XP/day
  bestDow?: string | null;
  goals?: string[]; // active boss / dungeon names
}

interface CoachPlan {
  headline: string;
  focus: string;
  actions: string[];
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        enabled: false,
        message: "AI coach is disabled. Set ANTHROPIC_API_KEY in your environment to enable it.",
      },
      { status: 501 },
    );
  }

  let body: CoachBody;
  try {
    body = (await req.json()) as CoachBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const statLines = (body.stats ?? []).map((s) => `- ${s.label}: level ${s.level}`).join("\n");
  const userPrompt = [
    "Here is my current standing in a life-gamification app.",
    statLines ? `Stats:\n${statLines}` : "No stats yet.",
    body.weakest ? `Weakest area: ${body.weakest}` : "",
    `Current streak: ${body.streak ?? 0} days`,
    `XP last 7 days: ${body.recentXp ?? 0} (avg ${body.dailyAvg ?? 0}/day)`,
    body.bestDow ? `Most productive weekday: ${body.bestDow}` : "",
    body.goals && body.goals.length ? `Active goals: ${body.goals.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 700,
      system:
        "You are a sharp, encouraging personal-growth coach inside a habit RPG. " +
        "Given the player's stats and recent activity, decide what they should focus " +
        "on this week and give 3 concrete, specific actions. Be motivating but not " +
        "cheesy. Respond with ONLY valid minified JSON of the form " +
        '{"headline": string, "focus": string, "actions": string[]} — ' +
        "headline ≤ 8 words, focus 1-2 sentences, exactly 3 actions, each ≤ 14 words.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    let plan: CoachPlan;
    try {
      const json = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(json) as Partial<CoachPlan>;
      plan = {
        headline: parsed.headline?.trim() || "This week's focus",
        focus: parsed.focus?.trim() || text,
        actions: Array.isArray(parsed.actions) ? parsed.actions.filter(Boolean).slice(0, 3) : [],
      };
    } catch {
      // Model didn't return clean JSON — fall back to showing the raw text.
      plan = { headline: "This week's focus", focus: text, actions: [] };
    }

    return NextResponse.json({ enabled: true, plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate coaching.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
