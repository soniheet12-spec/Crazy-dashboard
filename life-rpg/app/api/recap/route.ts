import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

// ─── Phase 2: AI "narrator" weekly recap ──────────────────────────────────────
// Turns the week's completed quests into a short RPG-style recap via Claude.
// Gated behind ANTHROPIC_API_KEY — degrades gracefully (501) when not set.

interface RecapQuest {
  title: string;
  stat: string;
  xp: number;
  completedAt?: string;
}

interface RecapBody {
  quests?: RecapQuest[];
  characterLevel?: number;
  streak?: number;
  totalXp?: number;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        enabled: false,
        message:
          "AI recap is disabled. Set ANTHROPIC_API_KEY in your environment to enable it.",
      },
      { status: 501 },
    );
  }

  let body: RecapBody;
  try {
    body = (await req.json()) as RecapBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const quests = body.quests ?? [];
  if (quests.length === 0) {
    return NextResponse.json(
      { message: "No completed quests this week to narrate." },
      { status: 400 },
    );
  }

  const questLines = quests
    .map((q) => `- ${q.title} (${q.stat}, +${q.xp} XP)`)
    .join("\n");

  const userPrompt = [
    `Here is my week as a role-playing-game character.`,
    `Character Level: ${body.characterLevel ?? "?"}`,
    `Current streak: ${body.streak ?? 0} days`,
    `Total XP: ${body.totalXp ?? 0}`,
    ``,
    `Quests completed this week:`,
    questLines,
  ].join("\n");

  try {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system:
        "You are the narrator of a fantasy RPG. Given a player's real-life " +
        "accomplishments (logged as 'quests'), write a short, punchy, second-person " +
        "recap of their week as an epic adventure log — 120-180 words, vivid but not " +
        "cheesy. Reference their actual quests and stats. End with a single line of " +
        "encouragement for the week ahead.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const recap = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ enabled: true, recap });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate recap.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
