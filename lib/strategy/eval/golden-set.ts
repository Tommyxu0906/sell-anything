import type { OfferingAttrs, SignalReadings, Channel } from "../channel-model";

/**
 * Hand-labeled golden set for evaluating the channel-fit model.
 *
 * Each case is a real-world business archetype with (a) its offering attributes,
 * (b) the signals a good extraction would produce, and (c) the channel(s) a
 * domain expert would consider a correct #1 recommendation. The eval script
 * measures how often the model's top pick lands in `acceptableTop`.
 *
 * This is what turns "trust the model" into "the model is 90% top-1 accurate on
 * a labeled set" — the kind of claim that survives an interview.
 */

export interface GoldenCase {
  name: string;
  attrs: OfferingAttrs;
  signals: SignalReadings;
  acceptableTop: Channel[]; // any of these as #1 counts as a top-1 hit
}

// convenience: strong present signal
const s = (strength: number, confidence = 0.85) => ({ present: true, strength, confidence });

export const GOLDEN_SET: GoldenCase[] = [
  {
    name: "B2B SaaS — project management tool (mid ACV)",
    attrs: { audienceType: "b2b", priceBand: "mid", salesCycle: "medium", geoScope: "global" },
    signals: {
      search_demand: s(0.9),
      commercial_intent_keywords: s(0.8),
      buyer_identifiable: s(0.85),
      high_consideration: s(0.7),
      content_competition: s(0.8),
    },
    acceptableTop: ["seo_content", "outbound_email"],
  },
  {
    name: "Enterprise cybersecurity platform",
    attrs: { audienceType: "b2b", priceBand: "enterprise", salesCycle: "long", geoScope: "global", avgDealValue: 80000 },
    signals: {
      buyer_identifiable: s(0.9),
      phone_reachable: s(0.8),
      high_consideration: s(0.9),
      content_competition: s(0.7),
    },
    acceptableTop: ["cold_call", "outbound_email"],
  },
  {
    name: "Local dental practice",
    attrs: { audienceType: "local", priceBand: "mid", salesCycle: "short", geoScope: "local" },
    signals: {
      local_geo_signal: s(0.95),
      review_volume: s(0.9),
      search_demand: s(0.7),
      commercial_intent_keywords: s(0.6),
    },
    acceptableTop: ["local_presence"],
  },
  {
    name: "DTC scented candle brand",
    attrs: { audienceType: "b2c", priceBand: "low", salesCycle: "impulse", geoScope: "national", avgDealValue: 40 },
    signals: {
      social_visual_fit: s(0.95),
      competitor_ad_presence: s(0.85),
      community_presence: s(0.7),
      commercial_intent_keywords: s(0.5),
    },
    acceptableTop: ["social_paid", "social_organic"],
  },
  {
    name: "Industrial B2B equipment manufacturer",
    attrs: { audienceType: "b2b", priceBand: "high", salesCycle: "long", geoScope: "national", avgDealValue: 25000 },
    signals: {
      buyer_identifiable: s(0.85),
      phone_reachable: s(0.85),
      high_consideration: s(0.9),
      search_demand: s(0.4),
    },
    acceptableTop: ["cold_call", "outbound_email"],
  },
  {
    name: "Boutique management consultancy",
    attrs: { audienceType: "b2b", priceBand: "high", salesCycle: "long", geoScope: "regional" },
    signals: {
      word_of_mouth_signal: s(0.9),
      buyer_identifiable: s(0.75),
      high_consideration: s(0.85),
      review_volume: s(0.5),
    },
    acceptableTop: ["referral", "outbound_email"],
  },
  {
    name: "Mobile puzzle game (free-to-play)",
    attrs: { audienceType: "b2c", priceBand: "low", salesCycle: "impulse", geoScope: "global" },
    signals: {
      social_visual_fit: s(0.9),
      competitor_ad_presence: s(0.9),
      commercial_intent_keywords: s(0.5),
      community_presence: s(0.6),
    },
    acceptableTop: ["social_paid", "paid_search"],
  },
  {
    name: "Local HVAC repair service",
    attrs: { audienceType: "local", priceBand: "mid", salesCycle: "short", geoScope: "local" },
    signals: {
      local_geo_signal: s(0.95),
      review_volume: s(0.85),
      commercial_intent_keywords: s(0.8),
      search_demand: s(0.7),
    },
    acceptableTop: ["local_presence"],
  },
  {
    name: "Online course / creator infoproduct",
    attrs: { audienceType: "b2c", priceBand: "mid", salesCycle: "medium", geoScope: "global" },
    signals: {
      search_demand: s(0.85),
      high_consideration: s(0.8),
      community_presence: s(0.8),
      social_visual_fit: s(0.7),
      content_competition: s(0.5),
    },
    acceptableTop: ["seo_content", "social_organic"],
  },
  {
    name: "Regional personal-injury law firm",
    attrs: { audienceType: "local", priceBand: "high", salesCycle: "medium", geoScope: "regional" },
    signals: {
      local_geo_signal: s(0.85),
      commercial_intent_keywords: s(0.9),
      competitor_ad_presence: s(0.9),
      review_volume: s(0.7),
      high_consideration: s(0.7),
    },
    acceptableTop: ["paid_search", "local_presence"],
  },
];
