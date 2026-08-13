import { db } from "@/lib/db/client";
import { contacts, messages } from "@/lib/db/schema";
import { eq, and, desc, inArray, ne } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

type Contact = InferSelectModel<typeof contacts>;
type Message = InferSelectModel<typeof messages>;

export type PriorityBucket = "reply" | "hot" | "cold" | "review";

export interface PriorityItem {
  contact: Contact;
  bucket: PriorityBucket;
  reason: string;
  /** higher = more urgent */
  score: number;
  lastTouchAt: Date | null;
}

export interface PrioritiesResult {
  reply: PriorityItem[]; // they replied / inbound waiting — respond today
  hot: PriorityItem[]; // opened your email, didn't reply — strike while warm
  cold: PriorityItem[]; // interested but going stale — don't lose them
  review: PriorityItem[]; // AI drafts waiting for your approval
  totalActionable: number;
}

const DAY = 1000 * 60 * 60 * 24;

function daysSince(d: Date | null | undefined): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / DAY);
}

function fmtAgo(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/**
 * Computes "who to reach out to today" from real CRM state. Fully deterministic —
 * no LLM cost. Each contact lands in at most one bucket, most-urgent first.
 */
export async function getPriorities(
  orgId: string,
  businessLine?: "real_estate" | "life_insurance"
): Promise<PrioritiesResult> {
  const contactWhere = businessLine
    ? and(eq(contacts.orgId, orgId), eq(contacts.businessLine, businessLine))
    : eq(contacts.orgId, orgId);

  // Active contacts only — skip closed / opted-out
  const activeContacts = await db
    .select()
    .from(contacts)
    .where(
      and(
        contactWhere,
        ne(contacts.unsubscribed, true),
        ne(contacts.dnc, true),
      )
    );

  if (activeContacts.length === 0) {
    return { reply: [], hot: [], cold: [], review: [], totalActionable: 0 };
  }

  const contactIds = activeContacts.map((c) => c.id);
  const byId = new Map(activeContacts.map((c) => [c.id, c]));

  // All messages for these contacts, newest first
  const msgs = await db
    .select()
    .from(messages)
    .where(and(eq(messages.orgId, orgId), inArray(messages.contactId, contactIds)))
    .orderBy(desc(messages.createdAt));

  // Group messages per contact
  const msgsByContact = new Map<string, Message[]>();
  for (const m of msgs) {
    const arr = msgsByContact.get(m.contactId) ?? [];
    arr.push(m);
    msgsByContact.set(m.contactId, arr);
  }

  const reply: PriorityItem[] = [];
  const hot: PriorityItem[] = [];
  const cold: PriorityItem[] = [];
  const review: PriorityItem[] = [];
  const claimed = new Set<string>();

  for (const c of activeContacts) {
    const cMsgs = msgsByContact.get(c.id) ?? [];
    const lastAny = cMsgs[0] ?? null;
    const lastTouchAt = lastAny ? new Date(lastAny.createdAt) : null;

    // 1) REVIEW — an AI draft is pending your approval (outbound or reply draft)
    const pendingDraft = cMsgs.find(
      (m) => m.reviewStatus === "pending" && (m.direction === "outbound" || m.aiDraftReply)
    );
    if (pendingDraft) {
      review.push({
        contact: c,
        bucket: "review",
        reason: pendingDraft.aiDraftReply
          ? "AI drafted a reply — review & send"
          : "AI drafted outreach — review & send",
        score: 100,
        lastTouchAt,
      });
      claimed.add(c.id);
      continue;
    }

    // 2) REPLY — they wrote back and it hasn't been answered yet
    const lastInbound = cMsgs.find((m) => m.direction === "inbound");
    if (lastInbound) {
      const inboundAt = new Date(lastInbound.createdAt).getTime();
      const answered = cMsgs.some(
        (m) => m.direction === "outbound" && new Date(m.createdAt).getTime() > inboundAt
      );
      if (!answered) {
        const d = daysSince(lastInbound.createdAt);
        reply.push({
          contact: c,
          bucket: "reply",
          reason: `Replied ${fmtAgo(d)} — hasn't heard back from you`,
          score: 95 - (d ?? 0), // older unanswered replies are more urgent, but still top bucket
          lastTouchAt,
        });
        claimed.add(c.id);
        continue;
      }
    }

    // 3) HOT — they opened your last email but never replied (buying signal)
    const lastOutbound = cMsgs.find((m) => m.direction === "outbound");
    if (lastOutbound && lastOutbound.openedAt && !lastOutbound.repliedAt) {
      const openedDays = daysSince(lastOutbound.openedAt);
      // only actionable while still warm (opened within ~10 days)
      if (openedDays !== null && openedDays <= 10) {
        hot.push({
          contact: c,
          bucket: "hot",
          reason: `Opened your email ${fmtAgo(openedDays)} — no reply yet`,
          score: 80 - openedDays,
          lastTouchAt,
        });
        claimed.add(c.id);
        continue;
      }
    }

    // 4) COLD — engaged before (interested/replied/meeting) but going quiet
    const warmStages = ["replied", "interested", "meeting_booked", "qualified"];
    if (warmStages.includes(c.stage ?? "")) {
      const d = daysSince(lastTouchAt);
      if (d !== null && d >= 5) {
        cold.push({
          contact: c,
          bucket: "cold",
          reason: `${(c.stage ?? "").replace(/_/g, " ")} — quiet for ${d} days, don't let it slip`,
          score: 50 + Math.min(d, 40),
          lastTouchAt,
        });
        claimed.add(c.id);
      }
    }
  }

  const sortDesc = (a: PriorityItem, b: PriorityItem) => b.score - a.score;
  reply.sort(sortDesc);
  hot.sort(sortDesc);
  cold.sort(sortDesc);
  review.sort(sortDesc);

  return {
    reply,
    hot,
    cold,
    review,
    totalActionable: reply.length + hot.length + cold.length + review.length,
  };
}
