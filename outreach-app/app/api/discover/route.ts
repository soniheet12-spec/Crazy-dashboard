import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { industry, stage, location, count = 5 } = body;

  const prompt = `You are a startup research assistant. Generate ${count} realistic founder leads for outreach.

Criteria:
- Industry: ${industry || "B2B SaaS"}
- Stage: ${stage || "Seed to Series A"}
- Location: ${location || "USA"}

Return a JSON array of leads. Each lead must have:
{
  "name": "Full Name",
  "title": "Job Title",
  "company": "Company Name",
  "email": "realistic@email.com",
  "linkedin": "https://linkedin.com/in/handle",
  "description": "One sentence about their company",
  "fit_score": 85
}

Return ONLY the JSON array, no markdown, no explanation.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  let leads;
  try {
    leads = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    leads = match ? JSON.parse(match[0]) : [];
  }

  return NextResponse.json({ leads, count: leads.length });
}
