"use server";

import { db } from "@/lib/db/client";
import { contacts, companies, activities, contactSequences, sequences } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { revalidatePath } from "next/cache";

export async function updateContactStage(contactId: string, stage: typeof contacts.$inferInsert["stage"]) {
  const org = await requireOrg();

  const [old] = await db.select({ stage: contacts.stage }).from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.orgId, org.id))).limit(1);

  await db.update(contacts).set({ stage, updatedAt: new Date() })
    .where(and(eq(contacts.id, contactId), eq(contacts.orgId, org.id)));

  await db.insert(activities).values({
    orgId: org.id,
    contactId,
    type: "stage_changed",
    description: `Stage changed from ${old?.stage} to ${stage}`,
  });

  revalidatePath("/contacts");
}

export async function addNote(contactId: string, note: string) {
  const org = await requireOrg();

  await db.update(contacts).set({ notes: note, updatedAt: new Date() })
    .where(and(eq(contacts.id, contactId), eq(contacts.orgId, org.id)));

  await db.insert(activities).values({
    orgId: org.id,
    contactId,
    type: "note",
    description: note,
  });

  revalidatePath(`/contacts/${contactId}`);
}

export async function enrollInSequence(contactId: string, sequenceId: string) {
  const org = await requireOrg();

  // Check not already enrolled
  const [existing] = await db.select().from(contactSequences)
    .where(and(
      eq(contactSequences.contactId, contactId),
      eq(contactSequences.sequenceId, sequenceId),
      eq(contactSequences.orgId, org.id)
    )).limit(1);

  if (existing) return;

  const [cs] = await db.insert(contactSequences).values({
    orgId: org.id,
    contactId,
    sequenceId,
    currentStep: 1,
    status: "active",
    nextStepAt: new Date(),
  }).returning();

  // Trigger immediate first step
  try {
    await inngest.send({
      name: "outreach/send",
      data: { contactSequenceId: cs.id, orgId: org.id, stepNumber: 1 },
    });
  } catch {
    // Inngest not available in dev
  }

  await db.insert(activities).values({
    orgId: org.id,
    contactId,
    type: "email_sent",
    description: "Enrolled in sequence — AI drafting first email",
  });

  revalidatePath(`/contacts/${contactId}`);
}

export async function importContactsFromCSV(csvText: string) {
  const org = await requireOrg();

  const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const emailIdx = headers.findIndex((h) => h.includes("email"));
  const firstNameIdx = headers.findIndex((h) => h.includes("first") || h.includes("fname"));
  const lastNameIdx = headers.findIndex((h) => h.includes("last") || h.includes("lname"));
  const titleIdx = headers.findIndex((h) => h.includes("title") || h.includes("job"));
  const companyIdx = headers.findIndex((h) => h.includes("company") || h.includes("org"));

  if (emailIdx === -1) return;

  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      orgId: org.id,
      email: cols[emailIdx] ?? null,
      firstName: firstNameIdx >= 0 ? cols[firstNameIdx] : null,
      lastName: lastNameIdx >= 0 ? cols[lastNameIdx] : null,
      jobTitle: titleIdx >= 0 ? cols[titleIdx] : null,
      stage: "new" as const,
    };
  }).filter((r) => r.email);

  if (rows.length === 0) return;

  await db.insert(contacts).values(rows).onConflictDoNothing();

  revalidatePath("/contacts");
}
