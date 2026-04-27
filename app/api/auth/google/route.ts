import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/integrations/google-calendar";
import { getUser } from "@/lib/auth/supabase-server";
import { getCurrentOrg } from "@/lib/auth/current-org";

export async function GET(_req: NextRequest) {
  const user = await getUser();
  const org = await getCurrentOrg();

  if (!user || !org) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!));
  }

  const authUrl = getGoogleAuthUrl(user.id, org.id);
  return NextResponse.redirect(authUrl);
}
