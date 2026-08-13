/**
 * Run the research → strategy pipeline against a live offering, straight from
 * the CLI — no Docker, no Inngest dev server. Just needs DATABASE_URL and
 * ANTHROPIC_API_KEY.
 *
 *   pnpm tsx scripts/run-research.ts <offeringId>
 *   pnpm tsx scripts/run-research.ts            # picks the newest offering
 *
 * Prints progress, then the signals, the channel scorecard, and the strategy.
 */
import { db } from "@/lib/db/client";
import { offerings, researchSignals, channelStrategies, marketResearch } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { runResearchPipeline } from "@/lib/research/pipeline";
import { CHANNEL_LABELS, type ChannelScore, type Channel } from "@/lib/strategy/channel-model";

async function main() {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  // A real key is ~100+ chars; reject obvious placeholders so the failure is
  // clear rather than a cryptic 404 from the API rejecting the fake key.
  if (!key.startsWith("sk-ant-") || key.length < 40 || /placeholder|example|xxx|your/i.test(key)) {
    console.error("✖ ANTHROPIC_API_KEY is missing or a placeholder — the pipeline can't call Claude.");
    console.error("  Put a real key (sk-ant-…, ~100+ chars) in .env.local, then re-run:  pnpm research");
    process.exit(1);
  }

  let offeringId = process.argv[2];
  if (!offeringId) {
    const [newest] = await db.select().from(offerings).orderBy(desc(offerings.createdAt)).limit(1);
    if (!newest) {
      console.error("✖ No offerings found. Run `pnpm seed:demo` first, or pass an offeringId.");
      process.exit(1);
    }
    offeringId = newest.id;
  }

  const [offering] = await db.select().from(offerings).where(eq(offerings.id, offeringId)).limit(1);
  if (!offering) {
    console.error(`✖ Offering ${offeringId} not found.`);
    process.exit(1);
  }

  console.log(`\n▶ Researching: ${offering.name}`);
  console.log(`  ${offering.description}\n`);

  const t0 = Date.now();
  const result = await runResearchPipeline({
    orgId: offering.orgId,
    offeringId,
    onProgress: (stage, detail) => console.log(`  · ${stage}${detail ? ` (${detail})` : ""}…`),
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  // ── show what landed in the DB ──────────────────────────────────────────────
  const signals = await db.select().from(researchSignals).where(eq(researchSignals.researchId, result.researchId));
  const [strategyRow] = await db
    .select()
    .from(channelStrategies)
    .where(eq(channelStrategies.researchId, result.researchId))
    .limit(1);
  const [research] = await db.select().from(marketResearch).where(eq(marketResearch.id, result.researchId)).limit(1);

  console.log(`\n✅ Done in ${secs}s — evidence confidence ${Math.round(result.confidence * 100)}%\n`);

  console.log("─".repeat(64));
  console.log("MARKET SUMMARY");
  console.log("─".repeat(64));
  console.log(research?.summary ?? "(none)");

  console.log("\n" + "─".repeat(64));
  console.log(`SIGNALS EXTRACTED (${signals.length})`);
  console.log("─".repeat(64));
  for (const s of signals) {
    const v = s.value as { present: boolean; strength: number };
    console.log(`  ${v.present ? "✓" : "·"} ${s.key.padEnd(28)} strength ${v.strength}  conf ${s.confidence}`);
  }

  console.log("\n" + "─".repeat(64));
  console.log("CHANNEL SCORECARD");
  console.log("─".repeat(64));
  const scores = (strategyRow?.scores as ChannelScore[]) ?? [];
  for (const sc of scores) {
    const rec = (strategyRow?.recommended as Channel[])?.includes(sc.channel) ? " ★" : "";
    console.log(`  ${String(sc.fitScore).padStart(3)}  ${CHANNEL_LABELS[sc.channel]}${rec}`);
    console.log(`       ${sc.rationale}`);
  }

  console.log("\n" + "─".repeat(64));
  console.log("STRATEGY");
  console.log("─".repeat(64));
  console.log(strategyRow?.narrative ?? "(none)");

  process.exit(0);
}

main().catch((e) => {
  console.error("\n✖ Pipeline failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
