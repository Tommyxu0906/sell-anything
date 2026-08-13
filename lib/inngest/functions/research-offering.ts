import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db/client";
import {
  offerings,
  marketResearch,
  researchSignals,
  channelStrategies,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { planResearch } from "@/lib/research/plan";
import { gather } from "@/lib/research/gather";
import { extractSignals, type OfferingContext } from "@/lib/research/extract";
import { synthesizeFindings } from "@/lib/research/findings";
import type { ExtractedSignal, SignalKey } from "@/lib/research/signal-vocab";
import {
  scoreChannels,
  type OfferingAttrs,
  type SignalReadings,
} from "@/lib/strategy/channel-model";
import { generateStrategy } from "@/lib/strategy/generate-strategy";

/**
 * The agentic research → strategy pipeline.
 *
 * A durable, resumable, multi-model workflow. Each stage is a checkpointed
 * step.run() so a failure resumes without repeating LLM/network work. The LLM
 * plans (Sonnet), a deterministic tool layer gathers, Haiku extracts signals,
 * a pure model scores + decides, and Sonnet operationalizes. Includes one
 * bounded self-correction pass when signal coverage is thin.
 */
export const researchOffering = inngest.createFunction(
  {
    id: "research-offering",
    name: "Research offering & build channel strategy",
    triggers: [{ event: "research/offering" }],
    concurrency: { limit: 3 },
  },
  async ({ event, step }) => {
    const { orgId, offeringId } = event.data;

    // ── init: load offering, open a research run ──────────────────────────────
    const init = await step.run("init", async () => {
      const [off] = await db
        .select()
        .from(offerings)
        .where(and(eq(offerings.id, offeringId), eq(offerings.orgId, orgId)))
        .limit(1);
      if (!off) throw new Error(`Offering ${offeringId} not found`);

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

      await db
        .update(offerings)
        .set({ status: "researching", updatedAt: new Date() })
        .where(eq(offerings.id, offeringId));

      return { offering: off, researchId: research.id };
    });

    const offCtx: OfferingContext = {
      name: init.offering.name,
      description: init.offering.description,
      url: init.offering.url,
      audienceType: init.offering.audienceType,
      priceBand: init.offering.priceBand,
      geoScope: init.offering.geoScope,
    };
    const researchId = init.researchId;

    // ── plan: agent decides what to investigate ───────────────────────────────
    const plan = await step.run("plan", () => planResearch(offCtx));
    await step.run("save-plan", async () => {
      await db
        .update(marketResearch)
        .set({ plan, status: "gathering" })
        .where(eq(marketResearch.id, researchId));
    });

    // ── gather + extract ──────────────────────────────────────────────────────
    let corpus = await step.run("gather", () => gather(plan.queries));
    await step.run("mark-extracting", async () => {
      await db.update(marketResearch).set({ status: "extracting" }).where(eq(marketResearch.id, researchId));
    });
    let signals = await step.run("extract", () => extractSignals(offCtx, corpus));

    // ── bounded self-correction: thin coverage → one broadened pass ───────────
    if (signals.filter((s) => s.value.present).length < 4) {
      const extra = await step.run("gather-more", () =>
        gather([
          `${init.offering.name} reviews`,
          `${init.offering.name} alternatives`,
          `${init.offering.category ?? init.offering.name} for sale`,
        ])
      );
      const moreSignals = await step.run("extract-more", () => extractSignals(offCtx, extra));
      signals = mergeSignals(signals, moreSignals);
      corpus = { ...corpus, sources: [...corpus.sources, ...extra.sources] };
    }

    // ── persist signals (the auditable spine) ─────────────────────────────────
    await step.run("save-signals", async () => {
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
    });

    // ── score: deterministic decision (checkpointed for audit) ────────────────
    const attrs: OfferingAttrs = {
      audienceType: (init.offering.audienceType ?? "b2b") as OfferingAttrs["audienceType"],
      priceBand: init.offering.priceBand as OfferingAttrs["priceBand"],
      avgDealValue: init.offering.avgDealValue,
      salesCycle: init.offering.salesCycle as OfferingAttrs["salesCycle"],
      geoScope: init.offering.geoScope as OfferingAttrs["geoScope"],
    };
    const scorecard = await step.run("score", async () =>
      scoreChannels(attrs, toReadings(signals))
    );

    // ── synthesize findings + strategy ────────────────────────────────────────
    await step.run("mark-synthesizing", async () => {
      await db.update(marketResearch).set({ status: "synthesizing" }).where(eq(marketResearch.id, researchId));
    });
    const findings = await step.run("synthesize-findings", () => synthesizeFindings(offCtx, corpus));
    const strategy = await step.run("synthesize-strategy", () =>
      generateStrategy({ offering: offCtx, researchSummary: findings.summary, scorecard })
    );

    // ── persist strategy + close out ──────────────────────────────────────────
    const overallConfidence = signals.length
      ? signals.reduce((s, x) => s + x.confidence, 0) / signals.length
      : 0.3;

    await step.run("persist", async () => {
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
      await db
        .update(offerings)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(offerings.id, offeringId));
    });

    return { offeringId, recommended: scorecard.recommended, confidence: round2(overallConfidence) };
  }
);

// ── helpers ──────────────────────────────────────────────────────────────────
function toReadings(signals: ExtractedSignal[]): SignalReadings {
  const out: SignalReadings = {};
  for (const s of signals) {
    out[s.key as SignalKey] = {
      present: s.value.present,
      strength: s.value.strength,
      confidence: s.confidence,
    };
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
