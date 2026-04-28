import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { IndustryPreset } from "@/lib/data/industry-presets";

const PlaybookSchema = z.object({
  valueProp: z.string().describe("Clear 1-2 sentence value proposition"),
  icpDescription: z.string().describe("Detailed ICP description for LLM scoring"),
  targetIndustries: z.array(z.string()).describe("3-8 target industries"),
  targetJobTitles: z.array(z.string()).describe("5-10 target job titles"),
  companySizeMin: z.number().describe("Minimum company headcount"),
  companySizeMax: z.number().describe("Maximum company headcount"),
  brandVoice: z.string().describe("Brand voice guide in 2-3 sentences"),
  tone: z.enum(["professional", "consultative", "direct", "casual", "challenger"]),
  sequenceStrategy: z.enum(["aggressive", "balanced", "nurture", "enterprise"]),
  objectionHandlers: z.array(z.object({
    trigger: z.string().describe("Common objection phrase"),
    response: z.string().describe("How to respond to this objection"),
  })).describe("3-5 common objections with responses"),
  icpScoreWeights: z.object({
    industry: z.number().min(0).max(100),
    title: z.number().min(0).max(100),
    companySize: z.number().min(0).max(100),
    seniority: z.number().min(0).max(100),
  }).describe("Weights for ICP scoring (should sum to ~100)"),
  sampleEmail: z.object({
    subject: z.string(),
    body: z.string().describe("3-4 sentence personalized cold email body, plain text"),
  }).describe("Example first-touch email for a hypothetical ideal prospect"),
  sequenceSteps: z.array(z.object({
    stepNumber: z.number(),
    delayDays: z.number(),
    subjectTemplate: z.string(),
    bodyTemplate: z.string().describe("Instructions for AI to follow when drafting this step"),
  })).describe("4-5 sequence steps appropriate for the strategy"),
  apolloSearchHints: z.object({
    keywords: z.array(z.string()).describe("Keywords to filter Apollo search"),
    excludeKeywords: z.array(z.string()).describe("Keywords to exclude"),
  }),
});

export type GeneratedPlaybook = z.infer<typeof PlaybookSchema>;

interface GeneratePlaybookParams {
  description: string;
  industryPreset?: IndustryPreset;
  orgName?: string;
}

export async function generatePlaybook({
  description,
  industryPreset,
  orgName = "your company",
}: GeneratePlaybookParams): Promise<GeneratedPlaybook> {
  const presetContext = industryPreset
    ? `\nIndustry category selected: ${industryPreset.label} (${industryPreset.description})
Suggested ICP: ${industryPreset.icp.icpDescription}
Suggested tone: ${industryPreset.tone}
Suggested strategy: ${industryPreset.strategy}`
    : "";

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: PlaybookSchema,
    prompt: `You are a B2B sales strategy expert. A company called "${orgName}" is setting up their outbound sales system. Generate a complete, highly customized sales playbook based on what they sell.

What they sell:
"""
${description}
"""
${presetContext}

Generate:
1. A sharp, specific ICP (ideal customer profile) — who actually buys this and why
2. Brand voice that matches the product and buyer persona
3. The right tone (professional/consultative/direct/casual/challenger) for this buyer
4. Strategy: how aggressive vs nurture-oriented should the sequence be?
   - aggressive: 5 touches in 2 weeks (transactional, high-volume B2B)
   - balanced: 4 touches over 1 month (typical B2B software/services)
   - nurture: 5-6 touches over 2-3 months (long sales cycle, relationship-driven)
   - enterprise: 4-5 touches over 6-8 weeks with multi-threading (complex sale)
5. 3-5 objection handlers specific to this product/market
6. A realistic sample email for touch 1 — personalized to a hypothetical ideal prospect
7. Full sequence with step-by-step templates that guide the AI drafter

Be HIGHLY SPECIFIC to what they sell. Generic advice is useless. Every field should feel like it was written by someone who deeply understands this product and market.`,
  });

  return object;
}

const StrategyDescriptions = {
  aggressive: "5 touches in 2 weeks — high velocity, transactional",
  balanced: "4 touches over 1 month — steady, professional cadence",
  nurture: "6 touches over 2–3 months — relationship-driven, long cycle",
  enterprise: "5 touches over 6–8 weeks — multi-thread, stakeholder-aware",
} as const;

export { StrategyDescriptions };
