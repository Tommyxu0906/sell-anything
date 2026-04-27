import { inngest } from "../client";
import { db } from "@/lib/db/client";
import {
  contactSequences,
  contacts,
  messages,
  organizations,
  sequenceSteps,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { draftEmail } from "@/lib/ai/draft-email";
import { sendEmail } from "@/lib/integrations/resend";
import { checkCompliance } from "@/lib/compliance/dnc";
import { addDays, isWeekend, nextMonday, set } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { InferSelectModel } from "drizzle-orm";
import type { contacts as contactsTable, organizations as orgsTable } from "@/lib/db/schema";
type Contact = InferSelectModel<typeof contactsTable>;
type Org = InferSelectModel<typeof orgsTable>;

export const runSequence = inngest.createFunction(
  {
    id: "run-sequence",
    name: "Run outreach sequence step",
    triggers: [{ event: "outreach/send" }],
    throttle: {
      limit: 200,
      period: "1h",
      key: "event.data.orgId",
    },
  },
  async ({ event, step }) => {
    const { contactSequenceId, orgId } = event.data;

    // Fetch all needed data
    const [contactSeq] = await step.run("fetch-sequence", async () => {
      return db
        .select({
          cs: contactSequences,
          contact: contacts,
          org: organizations,
        })
        .from(contactSequences)
        .innerJoin(contacts, eq(contactSequences.contactId, contacts.id))
        .innerJoin(organizations, eq(contactSequences.orgId, organizations.id))
        .where(
          and(
            eq(contactSequences.id, contactSequenceId),
            eq(contactSequences.orgId, orgId)
          )
        )
        .limit(1);
    });

    if (!contactSeq || contactSeq.cs.status !== "active") return { skipped: true };

    const { contact, org, cs } = contactSeq;
    const stepNumber = cs.currentStep ?? 1;

    // Fetch the sequence step template
    const [seqStep] = await step.run("fetch-step", async () => {
      return db
        .select()
        .from(sequenceSteps)
        .where(
          and(
            eq(sequenceSteps.sequenceId, cs.sequenceId),
            eq(sequenceSteps.stepNumber, stepNumber)
          )
        )
        .limit(1);
    });

    if (!seqStep) {
      // Sequence complete
      await step.run("mark-complete", async () => {
        await db
          .update(contactSequences)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(contactSequences.id, contactSequenceId));
      });
      return { completed: true };
    }

    // Compliance gate — must pass before ANY outbound
    const complianceOk = await step.run("compliance-check", () =>
      checkCompliance({ email: contact.email ?? "", orgId })
    );

    if (!complianceOk) {
      await step.run("mark-suppressed", async () => {
        await db
          .update(contactSequences)
          .set({ status: "paused" })
          .where(eq(contactSequences.id, contactSequenceId));
      });
      return { suppressed: true };
    }

    // Draft email via Claude (with prompt caching)
    const draft = await step.run("draft-email", () =>
      draftEmail({
        contact: contact as unknown as Contact,
        org: org as unknown as Org,
        subjectTemplate: seqStep.subjectTemplate ?? "",
        bodyTemplate: seqStep.bodyTemplate ?? "",
        stepNumber,
      })
    );

    // Check autonomy level: if org's send autonomy < L2, create pending review instead
    const autonomy = (org.autonomySettings as Record<string, string>)?.send ?? "L1";
    const autonomyLevel = parseInt(autonomy.replace("L", ""));

    if (autonomyLevel < 2) {
      // Queue for human review
      await step.run("queue-for-review", async () => {
        await db.insert(messages).values({
          orgId,
          contactId: contact.id,
          contactSequenceId,
          direction: "outbound",
          channel: "email",
          subject: draft.subject,
          body: draft.body,
          toEmail: contact.email ?? "",
          reviewStatus: "pending",
        });
      });
      return { queued_for_review: true };
    }

    // Autonomy >= L2: send automatically
    const sent = await step.run("send-email", async () => {
      const result = await sendEmail({
        to: contact.email!,
        subject: draft.subject,
        html: draft.body,
        orgId,
      });

      await db.insert(messages).values({
        orgId,
        contactId: contact.id,
        contactSequenceId,
        direction: "outbound",
        channel: "email",
        subject: draft.subject,
        body: draft.body,
        toEmail: contact.email ?? "",
        reviewStatus: "sent",
        sentAt: new Date(),
        messageId: result.messageId,
        metadata: { resendId: result.id },
      });

      return result;
    });

    // Advance to next step — compute send time respecting timezone + business hours
    const nextStep = stepNumber + 1;
    const [nextSeqStep] = await db
      .select()
      .from(sequenceSteps)
      .where(
        and(
          eq(sequenceSteps.sequenceId, cs.sequenceId),
          eq(sequenceSteps.stepNumber, nextStep)
        )
      )
      .limit(1);

    if (!nextSeqStep) {
      await step.run("finish-sequence", async () => {
        await db
          .update(contactSequences)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(contactSequences.id, contactSequenceId));
      });
      return { sent: true, completed: true };
    }

    // Compute next send window: add delay days, skip weekends, send at 9am local time
    const tz = contact.timezone ?? "America/New_York";
    let nextDate = addDays(new Date(), nextSeqStep.delayDays);
    if (isWeekend(toZonedTime(nextDate, tz))) {
      nextDate = nextMonday(nextDate);
    }
    const nextAt = fromZonedTime(
      set(toZonedTime(nextDate, tz), { hours: 9, minutes: 0, seconds: 0 }),
      tz
    );

    await step.run("advance-step", async () => {
      await db
        .update(contactSequences)
        .set({ currentStep: nextStep, nextStepAt: nextAt })
        .where(eq(contactSequences.id, contactSequenceId));
    });

    // Sleep until next step time and fire next step
    await step.sleepUntil("wait-for-next-step", nextAt);

    await step.sendEvent("trigger-next-step", {
      name: "outreach/send",
      data: { contactSequenceId, orgId, stepNumber: nextStep },
    });

    return { sent: true, nextStepAt: nextAt.toISOString() };
  }
);
