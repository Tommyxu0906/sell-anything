import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { buildPlaybookPrefix } from "./prompts/playbook-prefix";
import type { contacts, organizations } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Contact = InferSelectModel<typeof contacts>;
type Org = InferSelectModel<typeof organizations>;

interface DraftEmailParams {
  contact: Contact;
  org: Org;
  subjectTemplate: string;
  bodyTemplate: string;
  stepNumber: number;
}

interface DraftReplyParams {
  replyBody: string;
  classification: string;
  contact: Contact;
  org: Org;
}

export async function draftEmail({
  contact,
  org,
  subjectTemplate,
  bodyTemplate,
  stepNumber,
}: DraftEmailParams): Promise<{ subject: string; body: string }> {
  const playbookPrefix = buildPlaybookPrefix(org);

  const { text } = await generateText({
    // Sonnet 4.6 for email drafting
    model: anthropic("claude-sonnet-4-6"),
    messages: [
      {
        role: "user",
        // Cached prefix — playbook + org context (reused across all drafts for this org)
        content: [
          {
            type: "text",
            text: playbookPrefix,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          {
            type: "text",
            text: `
You are writing a personalized cold outreach email for a sales rep.

Contact details:
- Name: ${contact.firstName ?? ""} ${contact.lastName ?? ""}
- Job title: ${contact.jobTitle ?? "unknown"}
- Company: (see company context if available)
- LinkedIn: ${contact.linkedinUrl ?? "not available"}

Step ${stepNumber} of the sequence.
Subject template: "${subjectTemplate}"
Body template/guidance: "${bodyTemplate}"

Rules:
- Write in the brand voice defined above
- Keep it SHORT (3-5 sentences max for step 1, slightly longer for follow-ups)
- Highly specific to this person — no generic filler
- End with ONE clear, low-friction CTA
- Never make claims or promises not in the value proposition
- Do NOT use "I hope this finds you well" or similar openers

Return ONLY valid JSON with keys "subject" and "body" (body is plain text, no HTML).
`,
          },
        ],
      },
    ],
  });

  try {
    const parsed = JSON.parse(text);
    return { subject: parsed.subject, body: parsed.body };
  } catch {
    // Fallback: extract from text
    const lines = text.split("\n");
    return {
      subject: subjectTemplate,
      body: text,
    };
  }
}

export async function draftReply({
  replyBody,
  classification,
  contact,
  org,
}: DraftReplyParams): Promise<{ subject: string; body: string }> {
  const playbookPrefix = buildPlaybookPrefix(org);

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: playbookPrefix,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          {
            type: "text",
            text: `
Draft a reply to this inbound email from a prospect.

Contact: ${contact.firstName ?? ""} ${contact.lastName ?? ""}, ${contact.jobTitle ?? ""}
Classification: ${classification}
Their message:
"""
${replyBody}
"""

Guidelines based on classification:
- "interested": Thank them, propose 2-3 specific meeting times or send a booking link placeholder [BOOKING_LINK]
- "objection": Acknowledge their concern, use the objection handlers from your playbook, pivot back to value
- "ooo": Note their return date if mentioned, schedule a follow-up for then
- "book": Confirm the meeting, send calendar details
- "referral": Thank them, ask for an intro to the referral contact

Keep it conversational and brief. Human will review before sending.
Return ONLY valid JSON with "subject" and "body" (plain text).
`,
          },
        ],
      },
    ],
  });

  try {
    const parsed = JSON.parse(text);
    return { subject: parsed.subject, body: parsed.body };
  } catch {
    return { subject: `Re: your message`, body: text };
  }
}
