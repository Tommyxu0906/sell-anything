"use server";

import { db } from "@/lib/db/client";
import { organizations, playbooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function saveAutonomySettings(orgId: string, settings: Record<string, string>) {
  await db.update(organizations)
    .set({ autonomySettings: settings, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));
  revalidatePath("/settings");
}

export async function saveVoiceProfile(
  orgId: string,
  data: { voiceProfile: string; signatureName: string }
) {
  await db.update(organizations)
    .set({
      voiceProfile: data.voiceProfile.trim() || null,
      signatureName: data.signatureName.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));
  revalidatePath("/settings");
}

export async function savePlaybook(
  playbookId: string,
  data: { valueProp: string; brandVoice: string; icpDescription: string; caseStudies: string }
) {
  await db.update(playbooks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(playbooks.id, playbookId));
  revalidatePath("/settings");
}
