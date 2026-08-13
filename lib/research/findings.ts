import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { GatheredCorpus } from "./gather";
import type { OfferingContext } from "./extract";

/**
 * Synthesizes the raw corpus into human-readable findings for the Strategy page.
 * Descriptive only — it does not decide channels. Haiku (cheap).
 */

const FindingsSchema = z.object({
  summary: z.string().describe("3-5 sentence plain-language read of the market"),
  idealCustomer: z.string().describe("Who actually buys this and why"),
  competitors: z.array(z.string()).describe("Named competitors/alternatives found in the research"),
  demandNotes: z.string().describe("What the evidence says about demand and how buyers search/decide"),
});

export type ResearchFindings = z.infer<typeof FindingsSchema>;

export async function synthesizeFindings(
  offering: OfferingContext,
  corpus: GatheredCorpus
): Promise<ResearchFindings> {
  const evidence = corpus.results
    .slice(0, 14)
    .map((r) => `• ${r.title} — ${r.snippet} (${r.url})`)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: FindingsSchema,
    prompt: `Summarize market research for a product. Be factual and grounded in the evidence; if evidence is thin, say so rather than inventing.

PRODUCT: ${offering.name} — ${offering.description}

EVIDENCE (search results):
${evidence}

Return a concise market read: summary, ideal customer, named competitors actually found, and demand notes.`,
  });

  return object;
}
