import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { CHANNEL_LABELS, type Scorecard, type Channel } from "./channel-model";

/**
 * Strategy synthesis. The deterministic model has ALREADY decided the channel
 * ranking; this stage only explains and operationalizes it — a narrative plus a
 * concrete first play per recommended channel. The model is explicitly told not
 * to re-rank, keeping the decision auditable to the scorecard.
 *
 * Sonnet + structured output + prompt-cached offering/research prefix.
 */

const PlaySchema = z.object({
  channel: z.string().describe("The channel key this play is for"),
  firstMove: z.string().describe("The very first concrete action to take this week"),
  cadence: z.string().describe("Ongoing rhythm, e.g. '3 touches over 10 days' or '2 posts/week'"),
  sampleAsset: z.string().describe("A short ready-to-use example (subject line, call opener, headline, or ad hook)"),
  whyNow: z.string().describe("One sentence tying this to the research evidence"),
});

const StrategySchema = z.object({
  narrative: z.string().describe("3-5 sentence strategic overview: where to focus and why, in plain language"),
  plays: z.array(PlaySchema).describe("One play per recommended channel, in the given priority order"),
});

export type GeneratedStrategy = z.infer<typeof StrategySchema>;

export interface StrategyInput {
  offering: {
    name: string;
    description: string;
    audienceType?: string | null;
    priceBand?: string | null;
    geoScope?: string | null;
  };
  researchSummary?: string | null;
  scorecard: Scorecard;
}

export async function generateStrategy({
  offering,
  researchSummary,
  scorecard,
}: StrategyInput): Promise<GeneratedStrategy> {
  const recommended = scorecard.recommended;
  const rankedBlock = scorecard.scores
    .map(
      (s, i) =>
        `${i + 1}. ${CHANNEL_LABELS[s.channel]} — fit ${s.fitScore}/100, effort ${s.effort}/5, cost ${s.cost}/5. ${s.rationale}`
    )
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: StrategySchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a go-to-market strategist. A deterministic model has already scored and RANKED the sales channels for this product based on market research. Your job is NOT to re-rank — trust the ranking — but to explain the strategy and turn the TOP channels into concrete first plays.

PRODUCT:
Name: ${offering.name}
Description: ${offering.description}
Audience: ${offering.audienceType ?? "unknown"} | Price band: ${offering.priceBand ?? "unknown"} | Geography: ${offering.geoScope ?? "unknown"}

${researchSummary ? `MARKET RESEARCH SUMMARY:\n${researchSummary}\n` : ""}`,
            providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
          },
          {
            type: "text",
            text: `CHANNEL RANKING (from the scoring model — do not change the order):
${rankedBlock}

RECOMMENDED CHANNELS to build plays for (in priority order): ${recommended.map((c) => CHANNEL_LABELS[c as Channel]).join(", ")}

Write:
1. narrative — 3-5 sentences: the overall strategy, why these channels, and what to ignore for now.
2. plays — exactly one play per recommended channel above, in that order. Each play is concrete and specific to THIS product (real example asset, real cadence). Ground "whyNow" in the research/ranking.`,
          },
        ],
      },
    ],
  });

  return object;
}
