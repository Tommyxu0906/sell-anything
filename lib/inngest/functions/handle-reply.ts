import { inngest } from "../client";
import { db } from "@/lib/db/client";
import {
  contacts,
  contactSequences,
  messages,
  organizations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { classifyReply } from "@/lib/ai/classify-reply";
import { draftReply } from "@/lib/ai/draft-email";
import { addToSuppressionList } from "@/lib/compliance/unsubscribe";

export const handleReply = inngest.createFunction(
  { id: "handle-reply", name: "Handle inbound reply" },
  { event: "reply/received" },
  async ({ event, step }) => {
    const { orgId, contactId, messageId } = event.data;

    // Fetch message + contact + org
    const [msg] = await step.run("fetch-message", async () => {
      return db
        .select({ message: messages, contact: contacts, org: organizations })
        .from(messages)
        .innerJoin(contacts, eq(messages.contactId, contacts.id))
        .innerJoin(organizations, eq(messages.orgId, organizations.id))
        .where(eq(messages.id, messageId))
        .limit(1);
    });

    if (!msg) return { error: "message not found" };

    const { message, contact, org } = msg;

    // Classify the reply using Claude Haiku (cheap + fast)
    const classification = await step.run("classify-reply", () =>
      classifyReply({ body: message.body, contactName: contact.firstName ?? "" })
    );

    // Handle unsubscribe immediately — no further outreach ever
    if (classification === "unsubscribe") {
      await step.run("handle-unsubscribe", async () => {
        await addToSuppressionList({
          email: contact.email ?? "",
          orgId,
          reason: "unsubscribe",
        });

        await db
          .update(contacts)
          .set({ unsubscribed: true, unsubscribedAt: new Date(), stage: "unsubscribed" })
          .where(eq(contacts.id, contactId));

        // Pause any active sequences for this contact
        await db
          .update(contactSequences)
          .set({ status: "unsubscribed" })
          .where(
            and(
              eq(contactSequences.contactId, contactId),
              eq(contactSequences.status, "active")
            )
          );

        // Update classification on the message
        await db
          .update(messages)
          .set({ replyClassification: "unsubscribe" })
          .where(eq(messages.id, messageId));
      });
      return { classification: "unsubscribe", action: "suppressed" };
    }

    // Pause sequence on any real reply (they responded — stop automated follow-up)
    await step.run("pause-sequence", async () => {
      await db
        .update(contactSequences)
        .set({ status: "replied" })
        .where(
          and(
            eq(contactSequences.contactId, contactId),
            eq(contactSequences.status, "active")
          )
        );

      // Advance contact stage
      const newStage =
        classification === "interested" || classification === "book"
          ? "interested"
          : classification === "referral"
          ? "replied"
          : "replied";

      await db
        .update(contacts)
        .set({ stage: newStage })
        .where(eq(contacts.id, contactId));
    });

    // Draft a reply using Claude Sonnet
    const replyDraft = await step.run("draft-reply", () =>
      draftReply({
        replyBody: message.body,
        classification,
        contact,
        org,
      })
    );

    // Save draft + classification — always L1 for replies (human reviews)
    await step.run("save-draft", async () => {
      await db
        .update(messages)
        .set({
          replyClassification: classification,
          aiDraftReply: replyDraft.body,
          aiDraftSubject: replyDraft.subject,
        })
        .where(eq(messages.id, messageId));
    });

    return {
      classification,
      draftReady: true,
      requiresHumanReview: true,
    };
  }
);
