import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import {
  SIGNAL_KEYS,
  SIGNAL_DEFINITIONS,
  type ExtractedSignal,
  type SignalKey,
} from "./signal-vocab";
import type { GatheredCorpus } from "./gather";

/**
 * Extraction stage — the LLM's ONLY job in the decision path: read raw web
 * content and emit normalized signals from the closed vocabulary. It never
 * picks a channel or a score. Uses Haiku (cheap, fast) with structured output.
 */

const SignalSchema = z.object({
  key: z.enum(SIGNAL_KEYS),
  present: z.boolean().describe("Is there evidence this signal holds for this product's market?"),
  strength: z.number().min(0).max(1).describe("How strong the evidence is, 0–1"),
  confidence: z.number().min(0).max(1).describe("How confident you are in this read, 0–1"),
  rawExcerpt: z.string().max(240).optional().describe("Short quote/snippet that evidences this"),
});

const ExtractionSchema = z.object({
  signals: z.array(SignalSchema).describe("One entry per signal you can assess from the evidence"),
});

export interface OfferingContext {
  name: string;
  description: string;
  url?: string | null;
  audienceType?: string | null;
  priceBand?: string | null;
  geoScope?: string | null;
}

const DEFINITIONS_BLOCK = (SIGNAL_KEYS as readonly SignalKey[])
  .map((k) => `- ${k}: ${SIGNAL_DEFINITIONS[k]}`)
  .join("\n");

export async function extractSignals(
  offering: OfferingContext,
  corpus: GatheredCorpus
): Promise<ExtractedSignal[]> {
  const evidence = buildEvidence(corpus);

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: ExtractionSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You extract market signals from web research. Assess ONLY the signals in this fixed vocabulary — do not invent keys, do not recommend channels, do not score anything. Base every reading on the evidence; if the evidence is thin, say so with low confidence.

SIGNAL VOCABULARY:
${DEFINITIONS_BLOCK}`,
            providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
          },
          {
            type: "text",
            text: `PRODUCT/SERVICE BEING SOLD:
Name: ${offering.name}
Description: ${offering.description}
Audience: ${offering.audienceType ?? "unknown"} | Price band: ${offering.priceBand ?? "unknown"} | Geography: ${offering.geoScope ?? "unknown"}

WEB EVIDENCE (search results + fetched pages):
${evidence}

For each signal you can reasonably assess, return present/strength/confidence and a short supporting excerpt. Omit signals the evidence says nothing about rather than guessing.`,
          },
        ],
      },
    ],
  });

  // Dedupe by key (keep highest-confidence read) and normalize.
  const byKey = new Map<SignalKey, ExtractedSignal>();
  for (const s of object.signals) {
    const existing = byKey.get(s.key);
    if (existing && existing.confidence >= s.confidence) continue;
    byKey.set(s.key, {
      key: s.key,
      value: { present: s.present, strength: clamp01(s.strength) },
      confidence: clamp01(s.confidence),
      rawExcerpt: s.rawExcerpt,
      source: corpus.searchSource,
    });
  }
  return [...byKey.values()];
}

function buildEvidence(corpus: GatheredCorpus): string {
  const searchBlock = corpus.results
    .slice(0, 12)
    .map((r) => `• ${r.title} — ${r.snippet} (${r.url})`)
    .join("\n");

  const pageBlock = corpus.pages
    .slice(0, 5)
    .map((p) => `## ${p.title ?? p.url}\n${p.text.slice(0, 1800)}`)
    .join("\n\n");

  return `Search results for queries [${corpus.queries.join(" | ")}]:\n${searchBlock}\n\nFetched page content:\n${pageBlock}`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
