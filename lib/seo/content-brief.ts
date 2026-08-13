import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { SeoOfferingContext } from "./keyword-clusters";

/**
 * SEO channel assist: generate a ready-to-write content brief for a target
 * topic — the deliverable a writer needs to produce a page that ranks and
 * converts. Sonnet + structured output.
 */

const BriefSchema = z.object({
  title: z.string().describe("Compelling, SEO-friendly page title"),
  targetKeyword: z.string(),
  secondaryKeywords: z.array(z.string()).describe("Related keywords to work in naturally"),
  searchIntent: z.string().describe("What the searcher actually wants"),
  metaDescription: z.string().max(170).describe("Meta description under 160 chars"),
  outline: z
    .array(z.object({ heading: z.string(), points: z.array(z.string()) }))
    .describe("H2/H3 outline with bullet points to cover under each"),
  questionsToAnswer: z.array(z.string()).describe("People-also-ask style questions the page should answer"),
  suggestedWordCount: z.number().describe("Target length to be competitive"),
  internalLinkIdeas: z.array(z.string()).describe("Related pages/topics to link to"),
  cta: z.string().describe("The conversion action this page should drive"),
});

export type ContentBrief = z.infer<typeof BriefSchema>;

export async function generateContentBrief(
  offering: SeoOfferingContext,
  topic: string
): Promise<ContentBrief> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    prompt: `You are an SEO content strategist. Write a complete content brief a writer can execute without further guidance.

PRODUCT: ${offering.name} — ${offering.description}
Audience: ${offering.audienceType ?? "unknown"} | Geography: ${offering.geoScope ?? "unknown"}
TARGET TOPIC / KEYWORD: "${topic}"

Produce a brief that would rank for this topic AND convert readers toward the product. Be concrete and specific to this product — real headings, real questions, a real CTA.`,
    schema: BriefSchema,
  });

  return object;
}
