import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const LearningSchema = z.object({
  stylePreferences: z.array(z.object({
    key: z.string().describe("e.g. 'preferred_length', 'avoid_phrase', 'opener_style'"),
    rule: z.string().describe("Specific actionable rule derived from edit patterns"),
    confidence: z.number().min(0).max(1),
    evidenceCount: z.number(),
  })),
  performanceInsights: z.array(z.object({
    key: z.string().describe("e.g. 'best_subject_pattern', 'optimal_word_count', 'best_send_day'"),
    insight: z.string().describe("What works for this org, with specifics"),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
    confidence: z.number().min(0).max(1),
  })),
  updatedLearningContext: z.string().describe(
    "2-3 sentence summary of this org's style and what drives replies. Will be injected into every Claude prompt."
  ),
});

export type OrgLearningAnalysis = z.infer<typeof LearningSchema>;

interface EditPattern {
  aiSubject?: string | null;
  aiBody?: string | null;
  userSubject?: string | null;
  userBody?: string | null;
}

interface PerformanceData {
  totalSent: number;
  totalReplied: number;
  editedCount: number;
  editPatterns: EditPattern[];
  replyRateByStep: Record<string, number>;
  avgWordCountReplied: number;
  avgWordCountAll: number;
}

export async function analyzeOrgPerformance(
  orgName: string,
  data: PerformanceData,
  existingLearningContext?: string | null
): Promise<OrgLearningAnalysis> {
  const replyRate = data.totalSent > 0
    ? ((data.totalReplied / data.totalSent) * 100).toFixed(1)
    : "0";

  const editSamples = data.editPatterns.slice(0, 10).map((e, i) => {
    const aiWords = e.aiBody?.split(/\s+/).length ?? 0;
    const userWords = e.userBody?.split(/\s+/).length ?? 0;
    return `Edit ${i + 1}: AI wrote ${aiWords} words, user sent ${userWords} words. ${
      e.aiSubject !== e.userSubject ? `Subject changed from "${e.aiSubject}" to "${e.userSubject}".` : "Subject kept."
    }`;
  }).join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: LearningSchema,
    prompt: `You are analyzing sales email performance for "${orgName}" to extract what works and what doesn't. Use this to teach their AI agent to write better emails over time.

Performance summary (last 30 days):
- Sent: ${data.totalSent} emails
- Replied: ${data.totalReplied} (${replyRate}% reply rate)
- Human-edited ${data.editedCount} AI drafts before sending (${data.totalSent > 0 ? ((data.editedCount / data.totalSent) * 100).toFixed(0) : 0}% edit rate)
- Emails that got replies averaged ${data.avgWordCountReplied} words
- All emails averaged ${data.avgWordCountAll} words

Reply rate by step:
${Object.entries(data.replyRateByStep).map(([step, rate]) => `  Step ${step}: ${rate.toFixed(1)}%`).join("\n")}

Edit patterns (sample):
${editSamples || "No edits recorded yet."}

Existing learning context (if any):
${existingLearningContext ?? "None — this is the first analysis."}

Based on this data, extract:
1. Style preferences (what does this human consistently change in AI drafts?)
2. Performance insights (what email characteristics correlate with replies?)
3. An updated learning context — a brief guide for the AI drafter to follow going forward

Be specific. If there's not enough data, say so and keep confidence low.`,
  });

  return object;
}
