import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * SEO channel assist: generate a keyword-cluster map for an offering. Clusters
 * group related queries by search intent so the seller knows what content to
 * build first. Sonnet + structured output.
 */

const ClusterSchema = z.object({
  clusters: z
    .array(
      z.object({
        name: z.string().describe("Short cluster name / topic"),
        intent: z.enum(["informational", "commercial", "transactional", "navigational"]),
        keywords: z.array(z.string()).min(3).describe("Representative queries in this cluster"),
        contentType: z.string().describe("Best content format, e.g. 'how-to guide', 'comparison page', 'landing page'"),
        priority: z.enum(["high", "medium", "low"]).describe("Priority to pursue given buyer intent"),
      })
    )
    .min(4)
    .max(8),
});

export type KeywordClusters = z.infer<typeof ClusterSchema>;

export interface SeoOfferingContext {
  name: string;
  description: string;
  audienceType?: string | null;
  geoScope?: string | null;
}

export async function generateKeywordClusters(
  offering: SeoOfferingContext
): Promise<KeywordClusters> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: ClusterSchema,
    prompt: `You are an SEO strategist. Build a keyword-cluster map for this product/service.

PRODUCT: ${offering.name} — ${offering.description}
Audience: ${offering.audienceType ?? "unknown"} | Geography: ${offering.geoScope ?? "unknown"}

Return 4-8 clusters that a real content team would target. For each: a topic name, the dominant search intent, 3+ representative real-world queries someone would type, the best content format, and a priority based on how close the intent is to buying. Order clusters by priority (high first). Be specific to THIS product — no generic filler.`,
  });

  return object;
}
