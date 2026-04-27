import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const scoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  signals: z.array(z.string()),
});

interface LeadData {
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  location?: string | null;
  linkedinUrl?: string | null;
}

export async function scoreLead(lead: LeadData, icpDescription: string): Promise<{ score: number; reasoning: string }> {
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"), // Haiku — cheap for bulk scoring
    schema: scoreSchema,
    prompt: `
Score this prospect against the ideal customer profile (ICP).

ICP Description:
${icpDescription}

Prospect:
- Name: ${lead.firstName} ${lead.lastName}
- Job title: ${lead.jobTitle ?? "unknown"}
- Industry: ${lead.industry ?? "unknown"}
- Company size: ${lead.employeeCount ? `~${lead.employeeCount} employees` : "unknown"}
- Location: ${lead.location ?? "unknown"}
- LinkedIn: ${lead.linkedinUrl ? "yes" : "no"}

Score 0-100 where:
- 80-100: Excellent fit, high priority outreach
- 60-79: Good fit, include in sequence
- 40-59: Marginal fit, low priority
- 0-39: Poor fit, skip

Provide 2-3 specific signals (positive or negative) that drove the score.
`,
  });

  return { score: object.score, reasoning: object.reasoning };
}
