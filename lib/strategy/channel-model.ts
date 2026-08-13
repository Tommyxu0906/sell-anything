import type { SignalKey } from "@/lib/research/signal-vocab";

/**
 * Deterministic channel-fit scoring model.
 *
 * This is the decision core of the product and the heart of its defensibility:
 * the LLM extracts signals, but THIS pure function decides the channel mix.
 * Given offering attributes + normalized signals, it produces a fit score per
 * channel with a full contribution breakdown, so every recommendation can be
 * traced back to the exact priors and signals that produced it.
 *
 * Pure, versioned, and unit-tested. No LLM, no I/O, no randomness.
 */

export const MODEL_VERSION = "channel-model@1.0.0";

export const CHANNELS = [
  "outbound_email",
  "cold_call",
  "seo_content",
  "paid_search",
  "social_organic",
  "social_paid",
  "referral",
  "local_presence",
] as const;

export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  outbound_email: "Outbound Email",
  cold_call: "Cold Calling",
  seo_content: "SEO / Content",
  paid_search: "Paid Search",
  social_organic: "Organic Social",
  social_paid: "Paid Social",
  referral: "Referral / Word of Mouth",
  local_presence: "Local Presence",
};

export interface OfferingAttrs {
  audienceType: "b2b" | "b2c" | "local" | "mixed";
  priceBand?: "low" | "mid" | "high" | "enterprise" | null;
  avgDealValue?: number | null;
  salesCycle?: "impulse" | "short" | "medium" | "long" | null;
  geoScope?: "local" | "regional" | "national" | "global" | null;
}

export interface SignalReading {
  present: boolean;
  strength: number; // 0–1
  confidence: number; // 0–1
}

export type SignalReadings = Partial<Record<SignalKey, SignalReading>>;

export interface Contribution {
  kind: "prior" | "signal";
  key: string;
  points: number; // signed
  reason: string;
}

export interface ChannelScore {
  channel: Channel;
  fitScore: number; // 0–100
  effort: number; // 1–5 (5 = most effort)
  cost: number; // 1–5 (5 = most cash)
  confidence: number; // 0–1 (how much evidence backs this score)
  contributions: Contribution[];
  rationale: string;
}

export interface Scorecard {
  modelVersion: string;
  scores: ChannelScore[]; // sorted desc by fitScore
  recommended: Channel[]; // top channels worth pursuing
}

const NEUTRAL_BASE = 50;

interface SignalRule {
  key: SignalKey;
  dir: 1 | -1;
  weight: number; // max points at strength=1
  reason: string;
}

interface ChannelDef {
  channel: Channel;
  effort: number;
  cost: number;
  /** Priors derived from offering attributes (evidence-independent). */
  prior: (o: OfferingAttrs) => Contribution[];
  /** How each signal moves this channel's score. */
  signalRules: SignalRule[];
}

// ── Prior helpers ──────────────────────────────────────────────────────────
const p = (key: string, points: number, reason: string): Contribution => ({
  kind: "prior",
  key,
  points,
  reason,
});

const isHighValue = (o: OfferingAttrs) =>
  o.priceBand === "high" || o.priceBand === "enterprise" || (o.avgDealValue ?? 0) >= 5000;
const isLowValue = (o: OfferingAttrs) =>
  o.priceBand === "low" || (o.avgDealValue != null && o.avgDealValue > 0 && o.avgDealValue < 200);

// ── Channel definitions ──────────────────────────────────────────────────────
const CHANNEL_DEFS: ChannelDef[] = [
  {
    channel: "outbound_email",
    effort: 3,
    cost: 2,
    prior: (o) => {
      const c: Contribution[] = [];
      if (o.audienceType === "b2b" || o.audienceType === "mixed") c.push(p("audience_b2b", 18, "B2B buyers are reachable 1:1 by email"));
      if (o.audienceType === "b2c") c.push(p("audience_b2c", -16, "Cold-emailing consumers rarely works and risks spam law"));
      if (o.audienceType === "local") c.push(p("audience_local", -6, "Local demand is better captured than pushed"));
      if (isHighValue(o)) c.push(p("high_value", 10, "High deal value justifies per-prospect effort"));
      if (isLowValue(o)) c.push(p("low_value", -12, "Deal value too low to justify manual outreach"));
      return c;
    },
    signalRules: [
      { key: "buyer_identifiable", dir: 1, weight: 14, reason: "Specific buyers can be found and targeted" },
      { key: "high_consideration", dir: 1, weight: 6, reason: "Considered purchase rewards a tailored pitch" },
      { key: "local_geo_signal", dir: -1, weight: 5, reason: "Local demand favors presence over outreach" },
      { key: "social_visual_fit", dir: -1, weight: 4, reason: "Visual products convert better on social" },
    ],
  },
  {
    channel: "cold_call",
    effort: 4,
    cost: 2,
    prior: (o) => {
      const c: Contribution[] = [];
      if (o.audienceType === "b2b" || o.audienceType === "mixed") c.push(p("audience_b2b", 14, "B2B decision-makers take sales calls"));
      if (o.audienceType === "b2c") c.push(p("audience_b2c", -18, "Cold-calling consumers is low-yield and TCPA-risky"));
      if (isHighValue(o)) c.push(p("high_value", 16, "High-value complex sales benefit from live conversation"));
      if (isLowValue(o)) c.push(p("low_value", -20, "Call economics don't work at low deal value"));
      if (o.salesCycle === "long") c.push(p("cycle_long", 8, "Long cycles need relationship-building"));
      if (o.salesCycle === "impulse") c.push(p("cycle_impulse", -12, "Impulse buys don't need a call"));
      return c;
    },
    signalRules: [
      { key: "phone_reachable", dir: 1, weight: 16, reason: "Decision-makers are reachable by phone" },
      { key: "buyer_identifiable", dir: 1, weight: 8, reason: "Targets can be identified before dialing" },
      { key: "high_consideration", dir: 1, weight: 6, reason: "Complex purchase benefits from a live pitch" },
      { key: "social_visual_fit", dir: -1, weight: 6, reason: "Visual/consumer products fit social, not calls" },
    ],
  },
  {
    channel: "seo_content",
    effort: 5,
    cost: 2,
    prior: (o) => {
      const c: Contribution[] = [];
      if (o.geoScope === "national" || o.geoScope === "global") c.push(p("geo_broad", 8, "Broad geography scales organic reach"));
      if (o.geoScope === "local") c.push(p("geo_local", 4, "Local SEO captures nearby intent"));
      return c;
    },
    signalRules: [
      { key: "search_demand", dir: 1, weight: 18, reason: "Real organic search demand exists to capture" },
      { key: "commercial_intent_keywords", dir: 1, weight: 10, reason: "Buy-intent queries can be ranked for" },
      { key: "high_consideration", dir: 1, weight: 8, reason: "Research-heavy buyers read content before buying" },
      { key: "content_competition", dir: -1, weight: 12, reason: "Saturated results make ranking slow/hard" },
      { key: "competitor_ad_presence", dir: 1, weight: 3, reason: "Ad spend validates the demand is monetizable" },
    ],
  },
  {
    channel: "paid_search",
    effort: 2,
    cost: 5,
    prior: (o) => {
      const c: Contribution[] = [];
      if (isHighValue(o)) c.push(p("high_value", 8, "Margin can absorb click costs"));
      if (isLowValue(o)) c.push(p("low_value", -12, "Thin margin can't sustain CPC"));
      return c;
    },
    signalRules: [
      { key: "commercial_intent_keywords", dir: 1, weight: 16, reason: "High-intent queries convert on paid" },
      { key: "competitor_ad_presence", dir: 1, weight: 10, reason: "Competitors bidding = proven ROI" },
      { key: "search_demand", dir: 1, weight: 8, reason: "Search volume exists to buy" },
      { key: "content_competition", dir: 1, weight: 4, reason: "Paid bypasses slow organic competition" },
    ],
  },
  {
    channel: "social_organic",
    effort: 4,
    cost: 1,
    prior: (o) => {
      const c: Contribution[] = [];
      if (o.audienceType === "b2c") c.push(p("audience_b2c", 12, "Consumers discover products on social"));
      if (o.audienceType === "b2b") c.push(p("audience_b2b", -4, "B2B organic social is slower/narrower"));
      return c;
    },
    signalRules: [
      { key: "social_visual_fit", dir: 1, weight: 16, reason: "Visual/lifestyle product performs on social" },
      { key: "community_presence", dir: 1, weight: 12, reason: "Active communities to engage" },
      { key: "word_of_mouth_signal", dir: 1, weight: 6, reason: "Shareable, word-of-mouth category" },
      { key: "high_consideration", dir: -1, weight: 3, reason: "Very technical buys convert less on social" },
    ],
  },
  {
    channel: "social_paid",
    effort: 2,
    cost: 4,
    prior: (o) => {
      const c: Contribution[] = [];
      if (o.audienceType === "b2c") c.push(p("audience_b2c", 12, "Paid social targets consumer demographics well"));
      if (o.priceBand === "enterprise") c.push(p("price_enterprise", -6, "Enterprise buys don't close from a feed ad"));
      return c;
    },
    signalRules: [
      { key: "social_visual_fit", dir: 1, weight: 16, reason: "Creative-driven product suits paid social" },
      { key: "competitor_ad_presence", dir: 1, weight: 8, reason: "Competitors advertising = viable channel" },
      { key: "community_presence", dir: 1, weight: 4, reason: "Audiences to target exist" },
    ],
  },
  {
    channel: "referral",
    effort: 2,
    cost: 1,
    prior: (o) => {
      const c: Contribution[] = [];
      if (o.audienceType === "local") c.push(p("audience_local", 8, "Local services thrive on referrals"));
      if (isHighValue(o)) c.push(p("high_value", 6, "High trust needs pay off in referrals"));
      return c;
    },
    signalRules: [
      { key: "word_of_mouth_signal", dir: 1, weight: 18, reason: "Category spreads by word of mouth" },
      { key: "review_volume", dir: 1, weight: 8, reason: "Reviews-driven trust fuels referrals" },
      { key: "community_presence", dir: 1, weight: 6, reason: "Communities amplify referrals" },
    ],
  },
  {
    channel: "local_presence",
    effort: 2,
    cost: 2,
    prior: (o) => {
      const c: Contribution[] = [];
      if (o.geoScope === "local" || o.audienceType === "local") c.push(p("geo_local", 25, "Demand is local — maps/GBP/reviews win"));
      if (o.geoScope === "regional") c.push(p("geo_regional", 8, "Some local intent to capture"));
      if (o.geoScope === "national" || o.geoScope === "global") c.push(p("geo_broad", -20, "No local footprint to leverage"));
      return c;
    },
    signalRules: [
      { key: "local_geo_signal", dir: 1, weight: 18, reason: "'Near me' intent to capture" },
      { key: "review_volume", dir: 1, weight: 12, reason: "Reviews drive local selection" },
      { key: "search_demand", dir: 1, weight: 4, reason: "People search for local options" },
    ],
  },
];

/**
 * Score all channels for an offering given its signals. Deterministic.
 */
export function scoreChannels(
  offering: OfferingAttrs,
  signals: SignalReadings,
  opts: { recommendThreshold?: number; maxRecommended?: number } = {}
): Scorecard {
  const threshold = opts.recommendThreshold ?? 58;
  const maxRecommended = opts.maxRecommended ?? 4;

  const scores: ChannelScore[] = CHANNEL_DEFS.map((def) => {
    const contributions: Contribution[] = [];

    // Priors
    for (const c of def.prior(offering)) contributions.push(c);

    // Signal effects
    const referenced = def.signalRules.length;
    let covered = 0;
    let confAccum = 0;
    for (const rule of def.signalRules) {
      const reading = signals[rule.key];
      if (!reading || !reading.present) continue;
      covered++;
      confAccum += reading.confidence;
      const points = rule.dir * rule.weight * clamp01(reading.strength);
      if (Math.abs(points) < 0.01) continue;
      contributions.push({
        kind: "signal",
        key: rule.key,
        points: round1(points),
        reason: rule.reason,
      });
    }

    const raw = NEUTRAL_BASE + contributions.reduce((s, c) => s + c.points, 0);
    const fitScore = Math.round(clamp(raw, 0, 100));

    // Confidence: how much signal evidence actually backed this score.
    // No signals → rests on priors only → capped-low confidence.
    const coverage = referenced ? covered / referenced : 0;
    const avgSignalConf = covered ? confAccum / covered : 0;
    const confidence = round2(clamp(0.3 + 0.7 * coverage * avgSignalConf, 0, 1));

    return {
      channel: def.channel,
      fitScore,
      effort: def.effort,
      cost: def.cost,
      confidence,
      contributions: contributions.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
      rationale: buildRationale(def.channel, fitScore, contributions),
    };
  }).sort((a, b) => b.fitScore - a.fitScore);

  // Recommend: above threshold, at least the top 1, at most maxRecommended.
  let recommended = scores.filter((s) => s.fitScore >= threshold).map((s) => s.channel);
  if (recommended.length === 0) recommended = [scores[0].channel];
  recommended = recommended.slice(0, maxRecommended);

  return { modelVersion: MODEL_VERSION, scores, recommended };
}

function buildRationale(channel: Channel, fitScore: number, contributions: Contribution[]): string {
  const top = contributions.filter((c) => c.points > 0).slice(0, 2).map((c) => c.reason);
  const drag = contributions.filter((c) => c.points < 0).slice(0, 1).map((c) => c.reason);
  const label = CHANNEL_LABELS[channel];
  const verdict = fitScore >= 70 ? "Strong fit" : fitScore >= 58 ? "Worth testing" : fitScore >= 40 ? "Secondary" : "Poor fit";
  const because = top.length ? ` — ${top.join("; ")}` : "";
  const but = drag.length ? `. Watch: ${drag.join("; ")}` : "";
  return `${verdict} for ${label}${because}${but}.`;
}

// ── numeric helpers ──────────────────────────────────────────────────────────
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
