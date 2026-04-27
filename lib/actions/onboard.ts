"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { playbooks, sequences, sequenceSteps, organizations } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

export async function completeOnboarding(formData: FormData) {
  const org = await requireOrg();

  const whatYouSell = formData.get("whatYouSell") as string;
  const targetIndustries = (formData.get("targetIndustries") as string)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const targetJobTitles = (formData.get("targetJobTitles") as string)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const companySize = formData.get("companySize") as string;
  const brandVoice = formData.get("brandVoice") as string;

  // Upsert default playbook with real ICP data
  const [existingPlaybook] = await db
    .select()
    .from(playbooks)
    .where(eq(playbooks.orgId, org.id))
    .limit(1);

  const [playbook] = existingPlaybook
    ? await db
        .update(playbooks)
        .set({
          valueProp: whatYouSell,
          icpDescription: `Companies in ${targetIndustries.join(", ")} with ${companySize} employees, targeting ${targetJobTitles.join(", ")}`,
          targetIndustries,
          targetJobTitles,
          companySize: { label: companySize },
          brandVoice: brandVoice || "Professional, concise, direct.",
          updatedAt: new Date(),
        })
        .where(eq(playbooks.id, existingPlaybook.id))
        .returning()
    : await db
        .insert(playbooks)
        .values({
          orgId: org.id,
          name: "Default",
          isDefault: true,
          valueProp: whatYouSell,
          icpDescription: `Companies in ${targetIndustries.join(", ")} targeting ${targetJobTitles.join(", ")}`,
          targetIndustries,
          targetJobTitles,
          companySize: { label: companySize },
          brandVoice: brandVoice || "Professional, concise, direct.",
        })
        .returning();

  // Create default 4-touch cold outreach sequence
  const [seq] = await db
    .insert(sequences)
    .values({
      orgId: org.id,
      playbookId: playbook.id,
      name: "B2B Cold Outreach",
      isActive: true,
    })
    .returning();

  await db.insert(sequenceSteps).values([
    {
      sequenceId: seq.id,
      stepNumber: 1,
      delayDays: 0,
      channel: "email",
      subjectTemplate: "Quick question about {{company}}",
      bodyTemplate: `Write a personalized 3-sentence cold email introducing our company and asking for a 15-min call. Use the value prop. Keep it short and direct.`,
    },
    {
      sequenceId: seq.id,
      stepNumber: 2,
      delayDays: 3,
      channel: "email",
      subjectTemplate: "Re: Quick question about {{company}}",
      bodyTemplate: `Write a brief 2-sentence follow-up referencing the first email. Add one new piece of value or social proof.`,
    },
    {
      sequenceId: seq.id,
      stepNumber: 3,
      delayDays: 7,
      channel: "email",
      subjectTemplate: "One more thought",
      bodyTemplate: `Write a short "breakup" style follow-up. Acknowledge they're busy, offer one final value hook, easy yes/no close.`,
    },
    {
      sequenceId: seq.id,
      stepNumber: 4,
      delayDays: 14,
      channel: "email",
      subjectTemplate: "Closing the loop",
      bodyTemplate: `Final touch. Very short. Acknowledge timing might not be right. Leave the door open. No ask.`,
    },
  ]);

  // Mark org onboarding complete
  await db
    .update(organizations)
    .set({ updatedAt: new Date() })
    .where(eq(organizations.id, org.id));

  // Kick off first prospect pull — AI starts working immediately
  try {
    await inngest.send({
      name: "prospect/daily-pull",
      data: { orgId: org.id },
    });
  } catch {
    // Inngest not connected yet in dev — ignore
  }

  redirect("/dashboard");
}
