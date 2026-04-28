import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { buildPlaybookPrefix } from "./prompts/playbook-prefix";
import type { contacts, organizations, playbooks, orgLearnings } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Contact = InferSelectModel<typeof contacts>;
type Org = InferSelectModel<typeof organizations>;
type Playbook = InferSelectModel<typeof playbooks>;
type OrgLearning = InferSelectModel<typeof orgLearnings>;

interface DraftEmailParams {
  contact: Contact;
  org: Org;
  playbook?: Playbook | null;
  learnings?: OrgLearning[];
  subjectTemplate: string;
  bodyTemplate: string;
  stepNumber: number;
  sequenceTone?: string | null;
  sequenceStrategy?: string | null;
}

interface DraftReplyParams {
  replyBody: string;
  classification: string;
  contact: Contact;
  org: Org;
  playbook?: Playbook | null;
  learnings?: OrgLearning[];
}

export async function draftEmail({
  contact,
  org,
  playbook,
  learnings,
  subjectTemplate,
  bodyTemplate,
  stepNumber,
  sequenceTone,
  sequenceStrategy,
}: DraftEmailParams): Promise<{ subject: string; body: string }> {
  // Merge sequence-level tone/strategy overrides into a temp playbook-like object
  const effectivePlaybook = playbook
    ? {
        ...playbook,
        tone: (sequenceTone ?? playbook.tone) as Playbook["tone"],
        sequenceStrategy: (sequenceStrategy ?? playbook.sequenceStrategy) as Playbook["sequenceStrategy"],
      }
    : null;

  const playbookPrefix = buildPlaybookPrefix({ org, playbook: effectivePlaybook, learnings });

  const contactOverrides = [
    contact.toneOverride ? `Tone override for this contact: ${contact.toneOverride}` : null,
    contact.approachOverride ? `Approach override: ${contact.approachOverride}` : null,
    contact.contactMemory ? `Prior interaction context: ${contact.contactMemory}` : null,
  ].filter(Boolean).join("\n");

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
            text: `You are writing a personalized cold outreach email for a sales rep.

Contact details:
- Name: ${contact.firstName ?? ""} ${contact.lastName ?? ""}
- Job title: ${contact.jobTitle ?? "unknown"}
- LinkedIn: ${contact.linkedinUrl ?? "not available"}
${contactOverrides ? `\nPer-contact customization:\n${contactOverrides}` : ""}

Step ${stepNumber} of the sequence.
Subject template: "${subjectTemplate}"
Body template/guidance: "${bodyTemplate}"

Rules:
- Apply all learned style rules from the prefix (those override defaults)
- Keep it SHORT — 3-4 sentences max for step 1, slightly longer for later steps
- Highly specific to this person — no generic filler
- End with ONE clear, low-friction CTA
- Return ONLY valid JSON: {"subject": "...", "body": "..."}
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
    return { subject: subjectTemplate, body: text };
  }
}

export async function draftReply({
  replyBody,
  classification,
  contact,
  org,
  playbook,
  learnings,
}: DraftReplyParams): Promise<{ subject: string; body: string }> {
  const playbookPrefix = buildPlaybookPrefix({ org, playbook, learnings });

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
            text: `Draft a reply to this inbound email from a prospect.

Contact: ${contact.firstName ?? ""} ${contact.lastName ?? ""}, ${contact.jobTitle ?? ""}
${contact.contactMemory ? `Context from prior interactions: ${contact.contactMemory}` : ""}
Classification: ${classification}
Their message:
"""
${replyBody}
"""

Guidelines based on classification:
- "interested": Thank them, propose 2-3 specific meeting times or [BOOKING_LINK]
- "objection": Acknowledge their concern, use the objection handlers, pivot back to value
- "ooo": Note their return date, schedule a follow-up for then
- "book": Confirm the meeting, send calendar details
- "referral": Thank them, ask for an intro to the referral contact

Apply all learned style rules. Keep it conversational and brief. Human reviews before sending.
Return ONLY valid JSON: {"subject": "...", "body": "..."}
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
