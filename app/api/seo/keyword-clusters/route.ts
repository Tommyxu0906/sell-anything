import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { offerings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrg } from "@/lib/auth/current-org";
import { generateKeywordClusters } from "@/lib/seo/keyword-clusters";

export async function POST(req: NextRequest) {
  const { offeringId } = await req.json();
  if (!offeringId) return NextResponse.json({ error: "offeringId required" }, { status: 400 });

  const org = await requireOrg();
  const [offering] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.orgId, org.id)))
    .limit(1);
  if (!offering) return NextResponse.json({ error: "Offering not found" }, { status: 404 });

  const clusters = await generateKeywordClusters({
    name: offering.name,
    description: offering.description,
    audienceType: offering.audienceType,
    geoScope: offering.geoScope,
  });

  return NextResponse.json(clusters);
}
