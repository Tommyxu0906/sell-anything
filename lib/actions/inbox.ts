"use server";

import { db } from "@/lib/db/client";
import { messages, activities } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/integrations/resend";
import { revalidatePath } from "next/cache";

export async function approveAndSend(messageId: string) {
  const org = await requireOrg();

  const [msg] = await db.select().from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.orgId, org.id))).limit(1);

  if (!msg || msg.reviewStatus === "sent") return;

  // For reply drafts — send the AI draft
  const bodyToSend = msg.aiDraftReply ?? msg.body;
  const subjectToSend = msg.aiDraftSubject ?? msg.subject ?? "Follow up";

  await sendEmail({
    to: msg.toEmail ?? msg.fromEmail ?? "",
    subject: subjectToSend,
    html: bodyToSend.replace(/\n/g, "<br>"),
    orgId: org.id,
  });

  await db.update(messages)
    .set({ reviewStatus: "sent", sentAt: new Date() })
    .where(eq(messages.id, messageId));

  if (msg.contactId) {
    await db.insert(activities).values({
      orgId: org.id,
      contactId: msg.contactId,
      type: "email_sent",
      description: `Reply sent: ${subjectToSend}`,
    });
  }

  revalidatePath("/inbox");
}

export async function rejectDraft(messageId: string) {
  const org = await requireOrg();

  await db.update(messages)
    .set({ reviewStatus: "rejected" })
    .where(and(eq(messages.id, messageId), eq(messages.orgId, org.id)));

  revalidatePath("/inbox");
}

export async function editAndSend(messageId: string, subject: string, body: string) {
  const org = await requireOrg();

  const [msg] = await db.select().from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.orgId, org.id))).limit(1);

  if (!msg) return;

  await sendEmail({
    to: msg.toEmail ?? msg.fromEmail ?? "",
    subject,
    html: body.replace(/\n/g, "<br>"),
    orgId: org.id,
  });

  await db.update(messages)
    .set({ reviewStatus: "sent", sentAt: new Date(), body, subject })
    .where(eq(messages.id, messageId));

  revalidatePath("/inbox");
}
