import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?error=google_auth_failed", process.env.NEXT_PUBLIC_APP_URL!));
  }

  const { userId, orgId } = JSON.parse(state);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  const { tokens } = await oauth2Client.getToken(code);

  // Delete existing and re-insert (simpler than onConflictDoUpdate with composite key)
  await db.delete(integrations).where(
    and(
      eq(integrations.userId, userId),
      eq(integrations.orgId, orgId),
      eq(integrations.provider, "google_calendar")
    )
  );

  await db.insert(integrations).values({
    orgId,
    userId,
    provider: "google_calendar",
    accessTokenEncrypted: tokens.access_token ?? null,
    refreshTokenEncrypted: tokens.refresh_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    metadata: { email: tokens.id_token ? "connected" : null },
  });

  return NextResponse.redirect(new URL("/settings?success=google_connected", process.env.NEXT_PUBLIC_APP_URL!));
}
