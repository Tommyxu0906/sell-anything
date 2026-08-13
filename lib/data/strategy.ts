import { db } from "@/lib/db/client";
import { offerings, marketResearch, channelStrategies } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { ChannelScore } from "@/lib/strategy/channel-model";
import type { Channel } from "@/lib/strategy/channel-model";

type Offering = InferSelectModel<typeof offerings>;
type Research = InferSelectModel<typeof marketResearch>;
type Strategy = InferSelectModel<typeof channelStrategies>;

export interface StrategyPlay {
  channel: string;
  firstMove: string;
  cadence: string;
  sampleAsset: string;
  whyNow: string;
}

export interface StrategyView {
  offering: Offering;
  research: Research | null;
  strategy: (Omit<Strategy, "scores" | "recommended" | "playbookByChannel"> & {
    scores: ChannelScore[];
    recommended: Channel[];
    playbookByChannel: StrategyPlay[];
  }) | null;
}

/** Loads the offering + its latest research run + latest channel strategy. */
export async function getStrategyView(
  orgId: string,
  offeringId: string
): Promise<StrategyView | null> {
  const [offering] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.orgId, orgId)))
    .limit(1);
  if (!offering) return null;

  const [research] = await db
    .select()
    .from(marketResearch)
    .where(eq(marketResearch.offeringId, offeringId))
    .orderBy(desc(marketResearch.createdAt))
    .limit(1);

  const [strategyRow] = await db
    .select()
    .from(channelStrategies)
    .where(eq(channelStrategies.offeringId, offeringId))
    .orderBy(desc(channelStrategies.createdAt))
    .limit(1);

  const strategy = strategyRow
    ? {
        ...strategyRow,
        scores: (strategyRow.scores as ChannelScore[]) ?? [],
        recommended: (strategyRow.recommended as Channel[]) ?? [],
        playbookByChannel: (strategyRow.playbookByChannel as StrategyPlay[]) ?? [],
      }
    : null;

  return { offering, research: research ?? null, strategy };
}
