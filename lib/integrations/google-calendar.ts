import { google } from "googleapis";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  addDays,
  setHours,
  setMinutes,
  startOfDay,
  isWeekend,
  addMinutes,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

function buildOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
}

export function getGoogleAuthUrl(userId: string, orgId: string) {
  const oauth2Client = buildOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: JSON.stringify({ userId, orgId }),
    prompt: "consent",
  });
}

async function getOAuthClientForUser(userId: string, orgId: string) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.orgId, orgId),
        eq(integrations.provider, "google_calendar")
      )
    )
    .limit(1);

  if (!integration?.refreshTokenEncrypted) return null;

  const oauth2Client = buildOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: integration.refreshTokenEncrypted, // stored as plaintext for now; encrypt in production
  });

  return oauth2Client;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

export async function getAvailableSlots(
  userId: string,
  orgId: string,
  timezone: string = "America/New_York",
  daysAhead: number = 5
): Promise<TimeSlot[]> {
  const auth = await getOAuthClientForUser(userId, orgId);
  if (!auth) return [];

  const calendar = google.calendar({ version: "v3", auth });
  const slots: TimeSlot[] = [];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= daysAhead + 2; dayOffset++) {
    if (slots.length >= 6) break;

    const day = addDays(now, dayOffset);
    const dayInTz = toZonedTime(day, timezone);
    if (isWeekend(dayInTz)) continue;

    // Check 9am–5pm in 30-min windows
    for (const hour of [9, 10, 11, 14, 15, 16]) {
      if (slots.length >= 6) break;

      const slotStart = fromZonedTime(
        setMinutes(setHours(startOfDay(dayInTz), hour), 0),
        timezone
      );
      const slotEnd = addMinutes(slotStart, 30);

      // Check if free via freebusy
      const freebusy = await calendar.freebusy.query({
        requestBody: {
          timeMin: slotStart.toISOString(),
          timeMax: slotEnd.toISOString(),
          items: [{ id: "primary" }],
        },
      });

      const busy = freebusy.data.calendars?.primary?.busy ?? [];
      if (busy.length === 0) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          label: slotStart.toLocaleString("en-US", {
            timeZone: timezone,
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        });
      }
    }
  }

  return slots;
}

export async function createCalendarEvent({
  userId,
  orgId,
  title,
  description,
  start,
  end,
  attendeeEmail,
  timezone = "America/New_York",
}: {
  userId: string;
  orgId: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  attendeeEmail: string;
  timezone?: string;
}) {
  const auth = await getOAuthClientForUser(userId, orgId);
  if (!auth) throw new Error("Google Calendar not connected");

  const calendar = google.calendar({ version: "v3", auth });

  const event = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: {
      summary: title,
      description,
      start: { dateTime: start.toISOString(), timeZone: timezone },
      end: { dateTime: end.toISOString(), timeZone: timezone },
      attendees: [{ email: attendeeEmail }],
      conferenceData: {
        createRequest: { requestId: crypto.randomUUID() },
      },
    },
    conferenceDataVersion: 1,
  });

  return event.data;
}
