import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { OfferingContext } from "./extract";

/**
 * Planning stage — the agent decides what to investigate. Given an offering, it
 * emits targeted search queries designed to surface the signal vocabulary
 * (demand, competitors, ads, communities, reviews, buyer behavior). Sonnet,
 * structured output. This is the "agent proposes a plan" half of the loop.
 */

const PlanSchema = z.object({
  queries: z
    .array(z.string())
    .min(4)
    .max(10)
    .describe("Targeted web-search queries that will surface market signals for this product"),
  rationale: z.string().describe("One sentence on what these queries are trying to learn"),
});

export type ResearchPlan = z.infer<typeof PlanSchema>;

export async function planResearch(offering: OfferingContext): Promise<ResearchPlan> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: PlanSchema,
    prompt: `You are planning market research for a product/service to decide which sales channels fit best.

PRODUCT:
Name: ${offering.name}
Description: ${offering.description}
${offering.url ? `Website: ${offering.url}` : ""}
Audience: ${offering.audienceType ?? "unknown"} | Price band: ${offering.priceBand ?? "unknown"} | Geography: ${offering.geoScope ?? "unknown"}

Produce 4-10 web-search queries that, once run, will reveal:
- whether there's organic search demand and buy-intent keywords
- who the competitors are and whether they run paid ads
- where the audience congregates (communities, forums, social)
- whether reviews / word-of-mouth drive this category
- whether demand is local vs national

Write queries a real analyst would type into a search engine — specific to THIS product, not generic. Mix category terms, "best/vs/pricing" queries, "reddit"/"forum" queries, and (if local) geo queries.`,
  });

  return object;
}
