import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions, GOOGLE_ENABLED } from "@/lib/auth";
import type { CalendarEvent, CalendarEventsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<CalendarEventsResponse>> {
  // 1) No OAuth credentials configured on the server → degrade gracefully.
  if (!GOOGLE_ENABLED) {
    return NextResponse.json({ status: "not_configured" });
  }

  // 2) Not signed in (or token problem) → ask the user to connect.
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ status: "not_connected" });
  }

  // 3) Fetch today's + upcoming events (next 7 days) from the primary calendar.
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + 7);

    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });

    const events: CalendarEvent[] = (data.items ?? [])
      .filter((e) => e.status !== "cancelled")
      .map((e) => {
        const allDay = !!e.start?.date && !e.start?.dateTime;
        return {
          id: e.id ?? Math.random().toString(36).slice(2),
          title: e.summary ?? "(no title)",
          start: e.start?.dateTime ?? e.start?.date ?? now.toISOString(),
          end: e.end?.dateTime ?? e.end?.date ?? undefined,
          allDay,
        };
      });

    return NextResponse.json({ status: "ok", events });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      message: err instanceof Error ? err.message : "Failed to fetch events",
    });
  }
}
