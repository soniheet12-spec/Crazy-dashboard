import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);

  const html = `<!DOCTYPE html>
<html>
<head><title>OAuth Success</title></head>
<body style="font-family:monospace;padding:40px;background:#0e1420;color:#e8edf5;">
<h2 style="color:#3ecf8e">✅ Gmail OAuth Success!</h2>
<p>Add the following to your <strong>.env.local</strong>:</p>
<pre style="background:#141c2e;padding:20px;border-radius:8px;margin-top:16px;color:#5bc0f8;font-size:14px;">
GMAIL_REFRESH_TOKEN=${tokens.refresh_token || "(no refresh token — re-run with prompt:consent)"}
</pre>
<p style="margin-top:16px;color:#6b7a96">Access token expires: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : "unknown"}</p>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
