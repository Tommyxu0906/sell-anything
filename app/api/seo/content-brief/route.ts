import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { offerings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrg } from "@/lib/auth/current-org";
import { generateContentBrief } from "@/lib/seo/content-brief";

export async function POST(req: NextRequest) {
  const { offeringId, topic } = await req.json();
  if (!offeringId || !topic) {
    return NextResponse.json({ error: "offeringId and topic required" }, { status: 400 });
  }

  const org = await requireOrg();
  const [offering] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.orgId, org.id)))
    .limit(1);
  if (!offering) return NextResponse.json({ error: "Offering not found" }, { status: 404 });

  const brief = await generateContentBrief(
    {
      name: offering.name,
      description: offering.description,
      audienceType: offering.audienceType,
      geoScope: offering.geoScope,
    },
    topic
  );

  return NextResponse.json(brief);
}
