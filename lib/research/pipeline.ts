import { db } from "@/lib/db/client";
import {
  offerings,
  marketResearch,
  researchSignals,
  channelStrategies,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { planResearch } from "./plan";
import { gather } from "./gather";
import { extractSignals, type OfferingContext } from "./extract";
import { synthesizeFindings } from "./findings";
import type { ExtractedSignal, SignalKey } from "./signal-vocab";
import {
  scoreChannels,
  type OfferingAttrs,
  type SignalReadings,
} from "@/lib/strategy/channel-model";
import { generateStrategy } from "@/lib/strategy/generate-strategy";

/**
 * The research → strategy pipeline as a single reusable function.
 *
 * This is the ONE source of truth for the orchestration. The Inngest function
 * wraps it for durable execution; the CLI runner (scripts/run-research.ts)
 * calls it directly so the pipeline can run without Docker or the Inngest dev
 * server. Stage order: plan → gather → extract → score → synthesize → persist,
 * with a bounded self-correction pass on thin signal coverage.
 *
 * It updates market_research.status as it advances so the UI can show progress.
 */

export type PipelineStage =
  | "planning"
  | "gathering"
  | "extracting"
  | "scoring"
  | "synthesizing"
  | "done";

export interface RunPipelineArgs {
  orgId: string;
  offeringId: string;
  onProgress?: (stage: PipelineStage, detail?: string) => void;
}

export interface PipelineResult {
  researchId: string;
  recommended: string[];
  confidence: number;
}

export async function runResearchPipeline({
  orgId,
  offeringId,
  onProgress,
}: RunPipelineArgs): Promise<PipelineResult> {
  const progress = (stage: PipelineStage, detail?: string) => onProgress?.(stage, detail);

  // ── init ────────────────────────────────────────────────────────────────
  const [offering] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.orgId, orgId)))
    .limit(1);
  if (!offering) throw new Error(`Offering ${offeringId} not found`);

  const [research] = await db
    .insert(marketResearch)
    .values({
      orgId,
      offeringId,
      status: "planning",
      startedAt: new Date(),
      model: "sonnet-4-6 (plan/synth) + haiku-4-5 (extract)",
    })
    .returning();
  const researchId = research.id;

  await db.update(offerings).set({ status: "researching", updatedAt: new Date() }).where(eq(offerings.id, offeringId));

  const offCtx: OfferingContext = {
    name: offering.name,
    description: offering.description,
    url: offering.url,
    audienceType: offering.audienceType,
    priceBand: offering.priceBand,
    geoScope: offering.geoScope,
  };

  try {
    // ── plan ──────────────────────────────────────────────────────────────
    progress("planning");
    const plan = await planResearch(offCtx);
    await db.update(marketResearch).set({ plan, status: "gathering" }).where(eq(marketResearch.id, researchId));

    // ── gather + extract ────────────────────────────────────────────────────
    progress("gathering", `${plan.queries.length} queries`);
    let corpus = await gather(plan.queries);

    progress("extracting", `${corpus.pages.length} pages, ${corpus.results.length} results`);
    await db.update(marketResearch).set({ status: "extracting" }).where(eq(marketResearch.id, researchId));
    let signals = await extractSignals(offCtx, corpus);

    // bounded self-correction: thin coverage → one broadened pass
    if (signals.filter((s) => s.value.present).length < 4) {
      progress("gathering", "broadening (thin coverage)");
      const extra = await gather([
        `${offering.name} reviews`,
        `${offering.name} alternatives`,
        `${offering.category ?? offering.name} for sale`,
      ]);
      const more = await extractSignals(offCtx, extra);
      signals = mergeSignals(signals, more);
      corpus = { ...corpus, sources: [...corpus.sources, ...extra.sources] };
    }

    // ── persist signals ──────────────────────────────────────────────────────
    progress("scoring", `${signals.length} signals`);
    if (signals.length) {
      await db.insert(researchSignals).values(
        signals.map((s) => ({
          orgId,
          offeringId,
          researchId,
          source: s.source ?? corpus.searchSource,
          sourceType: "inferred" as const,
          key: s.key,
          value: s.value,
          weight: String(s.value.strength),
          confidence: String(s.confidence),
          rawExcerpt: s.rawExcerpt,
        }))
      );
    }
    await db.update(marketResearch).set({ status: "scoring" }).where(eq(marketResearch.id, researchId));

    // ── score (deterministic) ─────────────────────────────────────────────────
    const attrs: OfferingAttrs = {
      audienceType: (offering.audienceType ?? "b2b") as OfferingAttrs["audienceType"],
      priceBand: offering.priceBand as OfferingAttrs["priceBand"],
      avgDealValue: offering.avgDealValue,
      salesCycle: offering.salesCycle as OfferingAttrs["salesCycle"],
      geoScope: offering.geoScope as OfferingAttrs["geoScope"],
    };
    const scorecard = scoreChannels(attrs, toReadings(signals));

    // ── synthesize ────────────────────────────────────────────────────────────
    progress("synthesizing");
    await db.update(marketResearch).set({ status: "synthesizing" }).where(eq(marketResearch.id, researchId));
    const findings = await synthesizeFindings(offCtx, corpus);
    const strategy = await generateStrategy({ offering: offCtx, researchSummary: findings.summary, scorecard });

    const overallConfidence = signals.length
      ? signals.reduce((s, x) => s + x.confidence, 0) / signals.length
      : 0.3;

    // ── persist strategy + close out ─────────────────────────────────────────
    await db.insert(channelStrategies).values({
      orgId,
      offeringId,
      researchId,
      scores: scorecard.scores,
      recommended: scorecard.recommended,
      playbookByChannel: strategy.plays,
      narrative: strategy.narrative,
      modelVersion: scorecard.modelVersion,
    });
    await db
      .update(marketResearch)
      .set({
        status: "done",
        findings,
        summary: findings.summary,
        confidence: String(round2(overallConfidence)),
        sources: corpus.sources,
        completedAt: new Date(),
      })
      .where(eq(marketResearch.id, researchId));
    await db.update(offerings).set({ status: "ready", updatedAt: new Date() }).where(eq(offerings.id, offeringId));

    progress("done");
    return { researchId, recommended: scorecard.recommended, confidence: round2(overallConfidence) };
  } catch (e) {
    await db
      .update(marketResearch)
      .set({ status: "failed", error: e instanceof Error ? e.message : "pipeline error", completedAt: new Date() })
      .where(eq(marketResearch.id, researchId));
    await db.update(offerings).set({ status: "draft", updatedAt: new Date() }).where(eq(offerings.id, offeringId));
    throw e;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function toReadings(signals: ExtractedSignal[]): SignalReadings {
  const out: SignalReadings = {};
  for (const s of signals) {
    out[s.key as SignalKey] = { present: s.value.present, strength: s.value.strength, confidence: s.confidence };
  }
  return out;
}

function mergeSignals(a: ExtractedSignal[], b: ExtractedSignal[]): ExtractedSignal[] {
  const byKey = new Map<string, ExtractedSignal>();
  for (const s of [...a, ...b]) {
    const existing = byKey.get(s.key);
    if (existing && existing.confidence >= s.confidence) continue;
    byKey.set(s.key, s);
  }
  return [...byKey.values()];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
