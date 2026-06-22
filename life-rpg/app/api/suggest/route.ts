import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

// AI quest suggestions (Phase 2). Gated behind ANTHROPIC_API_KEY.
interface SuggestBody {
  stats?: { label: string; level: number }[];
  weakest?: string;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { enabled: false, message: "Set ANTHROPIC_API_KEY to enable AI quest suggestions." },
      { status: 501 },
    );
  }

  let body: SuggestBody;
  try {
    body = (await req.json()) as SuggestBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const statList = (body.stats ?? []).map((s) => `${s.label} (Lv ${s.level})`).join(", ");

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system:
        "You are a game master for a self-improvement RPG. Suggest 5 concrete, " +
        "specific, realistically-doable real-life quests tailored to the player's " +
        "stats, favoring their weakest stat. Respond with ONLY a JSON array of " +
        'objects shaped {"title": string, "stat": string (one of the player\'s stat ' +
        'labels), "xp": integer between 15 and 80}. No prose, no code fences.',
      messages: [
        {
          role: "user",
          content: `My stats: ${statList || "Body, Mind, Wealth, Social, Discipline"}. Weakest: ${
            body.weakest ?? "unknown"
          }. Suggest 5 quests as a JSON array.`,
        },
      ],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const match = text.match(/\[[\s\S]*\]/);
    const quests = match ? JSON.parse(match[0]) : [];
    return NextResponse.json({ enabled: true, quests });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to generate suggestions." },
      { status: 502 },
    );
  }
}
