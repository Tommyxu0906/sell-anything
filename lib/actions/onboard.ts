"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { playbooks, sequences, sequenceSteps, organizations } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import type { GeneratedPlaybook } from "@/lib/ai/generate-playbook";

export async function completeOnboarding(formData: FormData) {
  const org = await requireOrg();

  const playbookJsonStr = formData.get("playbookJson") as string | null;
  const description = formData.get("description") as string | null;

  // AI-generated path (new onboarding flow)
  if (playbookJsonStr) {
    const generated: GeneratedPlaybook = JSON.parse(playbookJsonStr);

    const [existingPlaybook] = await db
      .select()
      .from(playbooks)
      .where(eq(playbooks.orgId, org.id))
      .limit(1);

    const playbookData = {
      valueProp: generated.valueProp,
      icpDescription: generated.icpDescription,
      targetIndustries: generated.targetIndustries,
      targetJobTitles: generated.targetJobTitles,
      companySize: { min: generated.companySizeMin, max: generated.companySizeMax },
      brandVoice: generated.brandVoice,
      tone: generated.tone,
      sequenceStrategy: generated.sequenceStrategy,
      objectionHandlers: generated.objectionHandlers,
      icpScoreWeights: generated.icpScoreWeights,
      aiGenerated: true,
      generatedFrom: description ?? undefined,
      updatedAt: new Date(),
    };

    const [playbook] = existingPlaybook
      ? await db.update(playbooks).set(playbookData).where(eq(playbooks.id, existingPlaybook.id)).returning()
      : await db.insert(playbooks).values({
          orgId: org.id,
          name: "Default",
          isDefault: true,
          ...playbookData,
        }).returning();

    // Create sequence from AI-generated steps
    const [seq] = await db.insert(sequences).values({
      orgId: org.id,
      playbookId: playbook.id,
      name: "AI Cold Outreach",
      isActive: true,
      strategy: generated.sequenceStrategy,
      tone: generated.tone,
    }).returning();

    await db.insert(sequenceSteps).values(
      generated.sequenceSteps.map((step) => ({
        sequenceId: seq.id,
        stepNumber: step.stepNumber,
        delayDays: step.delayDays,
        channel: "email" as const,
        subjectTemplate: step.subjectTemplate,
        bodyTemplate: step.bodyTemplate,
      }))
    );

    await db.update(organizations)
      .set({ updatedAt: new Date() })
      .where(eq(organizations.id, org.id));

    try {
      await inngest.send({ name: "prospect/daily-pull", data: { orgId: org.id } });
    } catch {
      // Inngest not connected in dev
    }

    redirect("/dashboard");
  }

  // Legacy fallback path (manual form fields)
  const whatYouSell = formData.get("whatYouSell") as string;
  const targetIndustries = ((formData.get("targetIndustries") as string) ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const targetJobTitles = ((formData.get("targetJobTitles") as string) ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const companySize = formData.get("companySize") as string;
  const brandVoice = formData.get("brandVoice") as string;

  const [existingPlaybook] = await db.select().from(playbooks).where(eq(playbooks.orgId, org.id)).limit(1);

  const legacyData = {
    valueProp: whatYouSell,
    icpDescription: `Companies in ${targetIndustries.join(", ")} targeting ${targetJobTitles.join(", ")}`,
    targetIndustries,
    targetJobTitles,
    companySize: { label: companySize },
    brandVoice: brandVoice || "Professional, concise, direct.",
    updatedAt: new Date(),
  };

  const [playbook] = existingPlaybook
    ? await db.update(playbooks).set(legacyData).where(eq(playbooks.id, existingPlaybook.id)).returning()
    : await db.insert(playbooks).values({ orgId: org.id, name: "Default", isDefault: true, ...legacyData }).returning();

  const [seq] = await db.insert(sequences).values({
    orgId: org.id,
    playbookId: playbook.id,
    name: "B2B Cold Outreach",
    isActive: true,
  }).returning();

  await db.insert(sequenceSteps).values([
    { sequenceId: seq.id, stepNumber: 1, delayDays: 0, channel: "email", subjectTemplate: "Quick question about {{company}}", bodyTemplate: "Write a personalized 3-sentence cold email. Short and direct." },
    { sequenceId: seq.id, stepNumber: 2, delayDays: 3, channel: "email", subjectTemplate: "Re: Quick question about {{company}}", bodyTemplate: "Brief 2-sentence follow-up. Add one new value or social proof." },
    { sequenceId: seq.id, stepNumber: 3, delayDays: 7, channel: "email", subjectTemplate: "One more thought", bodyTemplate: "Short breakup-style follow-up. Acknowledge they're busy. Easy yes/no close." },
    { sequenceId: seq.id, stepNumber: 4, delayDays: 14, channel: "email", subjectTemplate: "Closing the loop", bodyTemplate: "Final touch. Very short. Leave the door open. No ask." },
  ]);

  await db.update(organizations).set({ updatedAt: new Date() }).where(eq(organizations.id, org.id));

  try {
    await inngest.send({ name: "prospect/daily-pull", data: { orgId: org.id } });
  } catch {}

  redirect("/dashboard");
}
