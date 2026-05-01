import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { buildPlaybookPrefix } from "./prompts/playbook-prefix";
import type { contacts, organizations, playbooks, messages, orgLearnings } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Contact = InferSelectModel<typeof contacts>;
type Org = InferSelectModel<typeof organizations>;
type Playbook = InferSelectModel<typeof playbooks>;
type Message = InferSelectModel<typeof messages>;
type OrgLearning = InferSelectModel<typeof orgLearnings>;

const CallScriptSchema = z.object({
  opener: z.string().describe("First 1-2 sentences to say when they pick up. Natural, not scripted-sounding."),
  contextBridge: z.string().describe("Brief bridge that references prior email/context to establish familiarity."),
  talkingPoints: z.array(z.object({
    point: z.string(),
    detail: z.string().describe("1-2 sentences to expand if they seem interested"),
  })).describe("3-4 key talking points in order of priority"),
  objectionHandlers: z.array(z.object({
    objection: z.string(),
    response: z.string().describe("Natural spoken response, not formal"),
  })).describe("2-3 most likely objections for this specific contact"),
  callToAction: z.string().describe("Exactly what you're asking for on this call. One thing only."),
  voicemailScript: z.string().describe(
    "If they don't pick up: leave this voicemail. Under 30 seconds when spoken. Natural, warm, specific."
  ),
  followUpNote: z.string().describe(
    "One sentence to send as a text/email immediately after the call regardless of outcome."
  ),
});

export type CallScript = z.infer<typeof CallScriptSchema>;

interface GenerateCallScriptParams {
  contact: Contact;
  org: Org;
  playbook?: Playbook | null;
  learnings?: OrgLearning[];
  priorMessages?: Message[];
  callPurpose?: "intro" | "follow_up" | "re_engage" | "close";
  businessLine?: "real_estate" | "life_insurance";
}

export async function generateCallScript({
  contact,
  org,
  playbook,
  learnings,
  priorMessages = [],
  callPurpose = "intro",
  businessLine = "real_estate",
}: GenerateCallScriptParams): Promise<CallScript> {
  const playbookPrefix = buildPlaybookPrefix({ org, playbook, learnings });
  const language = contact.preferredLanguage ?? "english";
  const isMandarin = language === "mandarin";
  const isBilingual = language === "bilingual";

  const emailHistory = priorMessages.length > 0
    ? priorMessages.slice(-5).map((m, i) => (
        `Email ${i + 1} (${m.direction}, ${m.reviewStatus ?? "draft"}): Subject: "${m.subject ?? "—"}" — ${
          m.body.slice(0, 120)}...`
      )).join("\n")
    : "No prior emails sent yet.";

  const purposeContext = {
    intro: "First contact — they may not recognize your name.",
    follow_up: "Following up on emails you've sent. Use the email context to establish familiarity quickly.",
    re_engage: "They went cold after initial interest. Re-open the conversation.",
    close: "They've shown interest. This call is about moving to a next step (meeting, application, showing).",
  }[callPurpose];

  const languageInstruction = isMandarin
    ? `IMPORTANT: Write the ENTIRE script in natural Simplified Chinese (普通话). This contact prefers Mandarin.
       Make it sound like natural spoken Chinese — not translated English. Warm, conversational, not formal.
       Opener example: "您好，我是[Name]，是波士顿的${businessLine === "real_estate" ? "房产经纪人" : "金融顾问"}，之前给您发过邮件…"`
    : isBilingual
    ? `Write the script in English, but add a (中文备选) note after the opener and voicemail
       showing the Mandarin version — in case they're more comfortable switching mid-call.`
    : `Write in English. Conversational American professional tone.`;

  const businessContext = businessLine === "real_estate"
    ? `Business line: Real Estate (Prophet Homes). You help investors and families find properties in Greater Boston.`
    : `Business line: Life Insurance (National Life Group). Educational, never pushy.
       Help them understand their protection gaps. Never quote specific premiums on a cold call.`;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: CallScriptSchema,
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
            text: `Generate a personalized phone call script for the following contact.

CONTACT:
- Name: ${contact.firstName ?? ""} ${contact.lastName ?? ""}
- Title: ${contact.jobTitle ?? "unknown"}
- Stage: ${contact.stage ?? "new"}
- Language preference: ${language}
${contact.toneOverride ? `- Tone override: ${contact.toneOverride}` : ""}
${contact.approachOverride ? `- Approach: ${contact.approachOverride}` : ""}
${contact.contactMemory ? `- Prior interaction notes: ${contact.contactMemory}` : ""}

BUSINESS CONTEXT:
${businessContext}

CALL PURPOSE: ${purposeContext}

EMAIL HISTORY:
${emailHistory}

LANGUAGE: ${languageInstruction}

Generate a natural, conversational call script — this is for a real human to speak, not read robotically.
Keep the opener under 15 seconds when spoken. The voicemail should be under 30 seconds.
The goal is: get ONE specific next step, not close the deal on this call.`,
          },
        ],
      },
    ],
  });

  return object;
}
