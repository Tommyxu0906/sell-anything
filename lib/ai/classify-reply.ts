import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const classificationSchema = z.object({
  classification: z.enum([
    "interested",
    "objection",
    "ooo",
    "unsubscribe",
    "book",
    "referral",
    "other",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export async function classifyReply({
  body,
  contactName,
}: {
  body: string;
  contactName: string;
}): Promise<
  "interested" | "objection" | "ooo" | "unsubscribe" | "book" | "referral" | "other"
> {
  const { object } = await generateObject({
    // Haiku 4.5 — cheap and fast for classification
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: classificationSchema,
    prompt: `
Classify this inbound reply from ${contactName} in the context of a B2B sales outreach sequence.

Reply:
"""
${body}
"""

Classifications:
- "interested": They want to learn more, are open to a call, or showing genuine positive interest
- "objection": They have a concern, question, or pushback (not ready to buy but not disqualified)
- "ooo": Out of office / auto-reply / vacation response
- "unsubscribe": Any request to stop receiving emails, opt-out, remove from list
- "book": They are explicitly ready to book a meeting or demo
- "referral": They are referring you to someone else in their org
- "other": Anything that doesn't fit above (spam, accidental reply, etc.)

Be conservative: if there's ANY hint of unsubscribe intent, classify as "unsubscribe".
`,
  });

  return object.classification;
}
