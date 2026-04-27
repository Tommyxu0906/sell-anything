import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { messages, contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { addToSuppressionList } from "@/lib/compliance/unsubscribe";

// Postmark inbound webhook — fires when someone replies to our outbound email
export async function POST(req: NextRequest) {
  // Verify webhook token
  const token = req.headers.get("x-postmark-token");
  if (token !== process.env.POSTMARK_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();

  // Extract key fields from Postmark inbound payload
  const fromEmail: string = payload.From ?? "";
  const toEmail: string = payload.To ?? "";
  const subject: string = payload.Subject ?? "";
  const textBody: string = payload.TextBody ?? "";
  const messageId: string = payload.MessageID ?? "";
  // Postmark puts original Message-ID in In-Reply-To header
  const inReplyTo: string = payload.Headers?.find(
    (h: { Name: string }) => h.Name === "In-Reply-To"
  )?.Value ?? "";

  if (!fromEmail) {
    return NextResponse.json({ ok: true }); // ignore invalid payloads
  }

  // Find the original outbound message this is replying to
  const [originalMessage] = await db
    .select()
    .from(messages)
    .where(eq(messages.messageId, inReplyTo.replace(/[<>]/g, "")))
    .limit(1);

  // Find contact by their email
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.email, fromEmail))
    .limit(1);

  if (!contact) {
    // Unknown sender — ignore
    return NextResponse.json({ ok: true });
  }

  // Check for unsubscribe in subject line (extra safety net on top of link)
  const isUnsubscribe =
    subject.toLowerCase().includes("unsubscribe") ||
    textBody.toLowerCase().includes("unsubscribe me") ||
    textBody.toLowerCase().includes("remove me");

  if (isUnsubscribe) {
    await addToSuppressionList({
      email: fromEmail,
      orgId: contact.orgId,
      reason: "unsubscribe",
    });
  }

  // Store the inbound message
  const [savedMessage] = await db
    .insert(messages)
    .values({
      orgId: contact.orgId,
      contactId: contact.id,
      contactSequenceId: originalMessage?.contactSequenceId ?? null,
      direction: "inbound",
      channel: "email",
      subject,
      body: textBody,
      fromEmail,
      toEmail,
      messageId,
      threadId: originalMessage?.threadId ?? inReplyTo ?? messageId,
      reviewStatus: "pending",
      metadata: { postmarkId: messageId, rawPayload: payload },
    })
    .returning();

  // Trigger Inngest function to classify + draft reply
  await inngest.send({
    name: "reply/received",
    data: {
      orgId: contact.orgId,
      contactId: contact.id,
      messageId: savedMessage.id,
      rawEmail: textBody,
    },
  });

  return NextResponse.json({ ok: true });
}
