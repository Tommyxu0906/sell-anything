/**
 * Canonical vocabulary of market-research signals.
 *
 * This is the CONTRACT between the two halves of the engine:
 *   - Extraction (LLM, `lib/research/extract.ts`) may only emit these keys.
 *   - Scoring (deterministic, `lib/strategy/channel-model.ts`) consumes them.
 *
 * Keeping the vocabulary closed is what makes the pipeline auditable and the
 * scoring model testable: a fixed set of inputs → a fixed, explainable output.
 */

export const SIGNAL_KEYS = [
  "search_demand", // meaningful organic search volume/intent exists for this category
  "commercial_intent_keywords", // buy-now / vendor-comparison queries exist
  "competitor_ad_presence", // competitors visibly running paid search/social ads
  "content_competition", // SEO difficulty — how saturated the organic results are
  "competitor_density", // how crowded the overall market is
  "review_volume", // ratings/reviews are abundant (trust-by-reviews category)
  "community_presence", // active forums/reddit/groups discussing the problem
  "social_visual_fit", // product is visual/lifestyle/demoable on social
  "buyer_identifiable", // specific buyers/accounts can be found & targeted 1:1
  "phone_reachable", // decision-makers are reachable & receptive by phone
  "local_geo_signal", // demand is local / "near me" / geographically bound
  "word_of_mouth_signal", // category spreads primarily via referral/word of mouth
  "high_consideration", // considered, research-heavy purchase (vs impulse)
] as const;

export type SignalKey = (typeof SIGNAL_KEYS)[number];

/** Human-readable definition per key — fed to the extractor's prompt. */
export const SIGNAL_DEFINITIONS: Record<SignalKey, string> = {
  search_demand:
    "Is there meaningful organic search demand for this category? Do people actively Google this problem/solution?",
  commercial_intent_keywords:
    "Do buy-intent queries exist (e.g. 'best X', 'X pricing', 'X vs Y', 'buy X')?",
  competitor_ad_presence:
    "Are competitors visibly running paid ads (Google Ads, sponsored results, social ads)?",
  content_competition:
    "How saturated are the organic search results with strong content? (high = hard to rank)",
  competitor_density:
    "How crowded is the overall market with alternatives?",
  review_volume:
    "Is this a category where buyers rely on abundant reviews/ratings before purchase?",
  community_presence:
    "Are there active communities (Reddit, forums, FB groups, Slack/Discord) discussing this?",
  social_visual_fit:
    "Is the product visual, lifestyle-oriented, or easily demoable on social platforms?",
  buyer_identifiable:
    "Can specific individual buyers or accounts be identified and targeted one-to-one?",
  phone_reachable:
    "Are decision-makers reachable and receptive to a phone conversation?",
  local_geo_signal:
    "Is demand local / geographically bound (people search 'near me', pick nearby providers)?",
  word_of_mouth_signal:
    "Does this category spread primarily through referrals and word of mouth?",
  high_consideration:
    "Is this a high-consideration, research-heavy purchase rather than an impulse buy?",
};

/** A normalized signal value. `strength` is 0–1; `confidence` is 0–1. */
export interface SignalValue {
  present: boolean;
  strength: number; // 0–1, how strong the evidence is
  note?: string;
}

/** A signal as produced by extraction, before persistence. */
export interface ExtractedSignal {
  key: SignalKey;
  value: SignalValue;
  confidence: number; // 0–1
  rawExcerpt?: string; // evidence snippet
  source?: string; // which source/url this came from
}

export function isSignalKey(k: string): k is SignalKey {
  return (SIGNAL_KEYS as readonly string[]).includes(k);
}
