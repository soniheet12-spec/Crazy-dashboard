import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return oauth2Client;
}

function makeRawEmail(to: string, from: string, subject: string, body: string) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ];
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  const { to, subject, body } = await req.json();

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 });
  }

  const auth = getOAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  const raw = makeRawEmail(to, process.env.GMAIL_FROM!, subject, body);

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return NextResponse.json({ success: true, messageId: result.data.id });
}
