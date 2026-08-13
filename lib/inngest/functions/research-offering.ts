import { inngest } from "@/lib/inngest/client";
import { runResearchPipeline } from "@/lib/research/pipeline";

/**
 * Durable wrapper around the research → strategy pipeline.
 *
 * The orchestration lives in lib/research/pipeline.ts (single source of truth,
 * also used by the CLI runner). Here it runs as one durable Inngest step so a
 * transient failure retries the run; the pipeline itself writes stage-by-stage
 * status to market_research so the UI shows live progress.
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
    return step.run("run-pipeline", () => runResearchPipeline({ orgId, offeringId }));
  }
);
