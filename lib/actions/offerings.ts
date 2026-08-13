"use server";

import { db } from "@/lib/db/client";
import { offerings } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inngest } from "@/lib/inngest/client";
import type { InferSelectModel } from "drizzle-orm";

export type Offering = InferSelectModel<typeof offerings>;

export interface OfferingInput {
  name: string;
  description: string;
  url?: string | null;
  category?: string | null;
  audienceType?: "b2b" | "b2c" | "local" | "mixed";
  priceModel?: string | null;
  priceBand?: "low" | "mid" | "high" | "enterprise" | null;
  avgDealValue?: number | null;
  salesCycle?: string | null;
  geoScope?: string | null;
}

/** List all offerings for the current org, newest first. */
export async function listOfferings(): Promise<Offering[]> {
  const org = await requireOrg();
  return db
    .select()
    .from(offerings)
    .where(eq(offerings.orgId, org.id))
    .orderBy(desc(offerings.createdAt));
}

/** Fetch a single offering, scoped to the current org. */
export async function getOffering(id: string): Promise<Offering | null> {
  const org = await requireOrg();
  const [row] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, id), eq(offerings.orgId, org.id)))
    .limit(1);
  return row ?? null;
}

/** Create an offering in `draft` status. Returns the new row. */
export async function createOffering(input: OfferingInput): Promise<Offering> {
  const org = await requireOrg();
  const [row] = await db
    .insert(offerings)
    .values({
      orgId: org.id,
      name: input.name,
      description: input.description,
      url: input.url ?? null,
      category: input.category ?? null,
      audienceType: input.audienceType ?? "b2b",
      priceModel: input.priceModel ?? null,
      priceBand: input.priceBand ?? null,
      avgDealValue: input.avgDealValue ?? null,
      salesCycle: input.salesCycle ?? null,
      geoScope: input.geoScope ?? null,
      status: "draft",
    })
    .returning();
  revalidatePath("/dashboard");
  return row;
}

/** Update mutable fields of an offering. */
export async function updateOffering(
  id: string,
  patch: Partial<OfferingInput> & { status?: Offering["status"] }
): Promise<void> {
  const org = await requireOrg();
  await db
    .update(offerings)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(offerings.id, id), eq(offerings.orgId, org.id)));
  revalidatePath(`/offerings/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Intake flow: create an offering from the onboarding form, kick off the
 * research→strategy pipeline, and send the user to the strategy page (which
 * shows a "researching…" state until the pipeline finishes).
 */
export async function startIntake(formData: FormData) {
  const org = await requireOrg();

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  if (!name || !description) throw new Error("Name and description are required");

  const num = (v: FormDataEntryValue | null) => {
    const n = parseInt((v as string) ?? "", 10);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? s : null;
  };

  const [offering] = await db
    .insert(offerings)
    .values({
      orgId: org.id,
      name,
      description,
      url: str(formData.get("url")),
      category: str(formData.get("category")),
      audienceType: (str(formData.get("audienceType")) ?? "b2b") as Offering["audienceType"],
      priceModel: str(formData.get("priceModel")),
      priceBand: str(formData.get("priceBand")) as Offering["priceBand"],
      avgDealValue: num(formData.get("avgDealValue")),
      salesCycle: str(formData.get("salesCycle")),
      geoScope: str(formData.get("geoScope")),
      status: "researching",
    })
    .returning();

  try {
    await inngest.send({
      name: "research/offering",
      data: { orgId: org.id, offeringId: offering.id },
    });
  } catch {
    // Inngest not connected in dev — offering still created; research can be retried
  }

  revalidatePath("/dashboard");
  redirect(`/offerings/${offering.id}/strategy`);
}

/** Re-run the research pipeline for an existing offering. */
export async function rerunResearch(offeringId: string) {
  const org = await requireOrg();
  await db
    .update(offerings)
    .set({ status: "researching", updatedAt: new Date() })
    .where(and(eq(offerings.id, offeringId), eq(offerings.orgId, org.id)));
  try {
    await inngest.send({
      name: "research/offering",
      data: { orgId: org.id, offeringId },
    });
  } catch {}
  revalidatePath(`/offerings/${offeringId}/strategy`);
}

/** Delete an offering (cascades research/signals/strategies via FK). */
export async function deleteOffering(id: string): Promise<void> {
  const org = await requireOrg();
  await db
    .delete(offerings)
    .where(and(eq(offerings.id, id), eq(offerings.orgId, org.id)));
  revalidatePath("/dashboard");
}
