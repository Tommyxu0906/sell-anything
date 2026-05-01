/**
 * Prophet Homes — Personal Agent Setup
 *
 * Run once to configure your local instance:
 *   pnpm seed:prophet
 *
 * Sets up:
 *   - Your org + playbook (Prophet Homes, DFW/Austin off-market RE)
 *   - Sequence 1: Investor Outreach (fix-and-flip/fix-and-rent buyers)
 *   - Sequence 2: Referral Partner Outreach (attorneys, CPAs, property managers)
 *   - Autonomy: L1 everywhere (you review every email before it sends)
 */

import "dotenv/config";
import { db } from "../lib/db/client";
import {
  organizations,
  playbooks,
  sequences,
  sequenceSteps,
} from "../lib/db/schema";
import { eq } from "drizzle-orm";

const ORG_NAME = "Prophet Homes";
const ORG_SLUG = "prophet-homes";

// ─── Playbook ────────────────────────────────────────────────────────────────

const PLAYBOOK = {
  name: "Prophet Homes — Agent Playbook",
  isDefault: true,
  industry: "commercial-real-estate",
  tone: "direct" as const,
  sequenceStrategy: "balanced" as const,
  aiGenerated: false,

  valueProp: `Prophet Homes is a Dallas-based off-market real estate marketplace backed by a $100M investment fund.
We specialize in sourcing single-family distressed properties (fix-and-flip and fix-and-rent) in DFW and Austin —
deals that never hit the MLS, priced in the $200K–$350K range, closing in days not months.`,

  icpDescription: `Real estate investors — individuals or small firms — actively deploying capital into fix-and-flip or
fix-and-rent single-family properties in Texas (DFW or Austin metro). They want reliable deal flow,
consistent off-market access, and fast closes. Typically doing 5–50+ transactions per year.`,

  targetIndustries: ["Real Estate", "Real Estate Investment", "Private Equity", "Family Office"],

  targetJobTitles: [
    "Real Estate Investor",
    "Managing Partner",
    "Principal",
    "Director of Acquisitions",
    "Portfolio Manager",
    "Acquisitions Manager",
    "Real Estate Syndicator",
    "Fix and Flip Operator",
  ],

  companySize: { min: 1, max: 50 }, // solo investors to small RE firms

  brandVoice: `Direct, deal-first, no fluff. Lead with numbers and specifics.
Investors don't want a sales pitch — they want deal flow. Sound like a fellow operator, not a broker.
First name only, short emails, always one clear ask.`,

  objectionHandlers: [
    {
      trigger: "not actively investing right now",
      response:
        "No problem — deals don't wait. When you're ready to get back in, I'll already have a pipeline built for you. Mind if I send one deal a month so you stay in the loop?",
    },
    {
      trigger: "already have a wholesaler",
      response:
        "Good to hear — most serious operators use 2-3 sources. Prophet has off-market access the retail wholesalers don't — specifically distressed estates, pre-foreclosure, and our fund's own pipeline. Worth adding one more source?",
    },
    {
      trigger: "DFW market is too hot / margins are thin",
      response:
        "Fair point on retail. Our deals are off-market, priced ahead of ARV — typical spreads are $40K–$80K on the flip. Happy to show you a recent comp.",
    },
    {
      trigger: "I only do Austin / I only do DFW",
      response:
        "Perfect — that's one of our core markets. I focus specifically there, so my deal flow is concentrated. I'll send you only what fits your buy box.",
    },
    {
      trigger: "what's your fee / how do you make money",
      response:
        "We earn an assignment fee on the deal, typically baked into the purchase price. You see the full underwriting before committing — no surprises. Standard marketplace model.",
    },
    {
      trigger: "send me what you have",
      response:
        "On it — I'll pull the two closest to your buy box and send by EOD. Can you confirm preferred ARV range and target neighborhoods so I send the right ones?",
    },
  ],

  caseStudies: `Recent deals closed through Prophet Homes:
- Oak Cliff, Dallas: 3/2, purchased $215K off-market, ARV $310K, renovated + resold in 74 days. Net spread: $68K.
- East Austin: 2/1 bungalow, purchased $268K, ARV $390K. Currently being rehabbed by investor — est. 90-day flip.
- Garland, TX: 4/2, fix-and-rent, purchased $189K, rents at $1,850/mo. 11.7% cap rate.
(Note: update with real closed deals as they come in)`,

  icpScoreWeights: {
    industry: 35,
    title: 40,
    companySize: 15,
    seniority: 10,
  },
};

// ─── Sequence 1: Investor Outreach ───────────────────────────────────────────

const INVESTOR_SEQUENCE = {
  name: "Investor Outreach — DFW/Austin Off-Market Deals",
  strategy: "balanced" as const,
  tone: "direct" as const,
  industryContext:
    "Target: active fix-and-flip or fix-and-rent operators in Dallas-Fort Worth and Austin. They buy off-market SFR. Focus on deal flow, margins, and speed of close. Do NOT pitch Prophet Homes as a company — pitch the deals.",
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "Off-market deals in {{city}} — straight to you",
      bodyTemplate: `Write a short intro email (3 sentences max) from a real estate agent at Prophet Homes.
Goal: establish that we source off-market SFR in DFW/Austin with real deal flow, and ask if they want to be added to the deal list.
Do NOT mention the company history or fund. Lead with the value: off-market access, fast closes, real spreads.
End with a single yes/no question: "Want me to send you deals as they come in?"
Tone: peer-to-peer, brief, direct.`,
    },
    {
      stepNumber: 2,
      delayDays: 4,
      subjectTemplate: "Quick follow-up — current inventory",
      bodyTemplate: `2-sentence follow-up. Reference the first email (didn't hear back).
Mention we just had [a specific type of deal — oak cliff flip, east austin bungalow — keep it vague but real-sounding] close.
Ask: "Still looking in [market]?" One question, one line.`,
    },
    {
      stepNumber: 3,
      delayDays: 10,
      subjectTemplate: "Deal sheet — [month] off-market inventory",
      bodyTemplate: `Reference that we have current inventory available.
Offer to share a deal sheet for their market (DFW or Austin, personalize to what we know).
Frame it as: "I put these together for investors on my list — takes 30 seconds to scan. Want me to send it over?"
Keep it 2-3 sentences. No ask for a call yet — just get them on the list.`,
    },
    {
      stepNumber: 4,
      delayDays: 21,
      subjectTemplate: "Closing the loop",
      bodyTemplate: `Final touch. Very short — 2 sentences max.
Acknowledge timing might not be right. Leave the door 100% open.
Something like: "I'll stop following up for now — if you ever want first look at off-market DFW/Austin SFR, I'm your person. Just reply 'yes' and I'll add you to the list."
No ask, no pressure.`,
    },
  ],
};

// ─── Sequence 2: Referral Partner Outreach ───────────────────────────────────

const REFERRAL_SEQUENCE = {
  name: "Referral Partner Outreach — Attorneys, CPAs & Property Managers",
  strategy: "nurture" as const,
  tone: "consultative" as const,
  industryContext:
    "Target: probate attorneys, divorce attorneys, estate planning attorneys, CPAs with property-owning clients, and property managers with distressed landlords. Goal: become their go-to referral for clients who need to sell a property quickly. Position as a service to their clients, not a sales pitch to them personally.",
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "Referral partnership — distressed property sales in DFW/Austin",
      bodyTemplate: `Write a brief intro email (3-4 sentences) from a real estate agent at Prophet Homes.
Audience: a probate/divorce attorney or CPA in DFW or Austin.
Goal: introduce the idea of being a referral partner for their clients who need to sell a property fast (estate sales, divorce settlements, distressed landlords, pre-foreclosure).
Key message: we close fast, all-cash or investor-backed, no listing hassle, and we pay a referral fee.
Ask: "Is this something your clients run into?" — soft, no pressure, genuine.
Do NOT be pushy or salesy. This is a professional peer outreach.`,
    },
    {
      stepNumber: 2,
      delayDays: 10,
      subjectTemplate: "Re: quick-close option for your clients",
      bodyTemplate: `Short follow-up (2 sentences). Reference you reached out about quick-close property sales for their clients.
Offer something specific: "Happy to send a one-pager on how the process works — takes 2 minutes to read."
Soft ask only. No call request yet.`,
    },
    {
      stepNumber: 3,
      delayDays: 25,
      subjectTemplate: "Thought of you — recent case",
      bodyTemplate: `Mention a recent situation (keep it general/anonymized): e.g., "Just helped an estate attorney in Dallas close a inherited property in 9 days — family needed quick resolution."
Frame it as: "This is the kind of situation I'm a resource for if it ever comes up with your clients."
No ask. Pure value / social proof. 2-3 sentences.`,
    },
    {
      stepNumber: 4,
      delayDays: 45,
      subjectTemplate: "Staying on your radar",
      bodyTemplate: `Very soft final touch. 2 sentences.
"I work with a handful of attorneys/CPAs in DFW who send me a referral once or twice a year when a client needs a fast exit. Happy to be that resource for you — no pressure, no obligation."
Leave the door open permanently. Include that they can reach out anytime.`,
    },
  ],
};

// ─── Autonomy: Solo agent — review everything ─────────────────────────────────

const AUTONOMY_SETTINGS = {
  prospect: "L3", // AI prospects autonomously, you review the leads it finds
  draft: "L2",    // AI drafts, flags edge cases — routine ones auto-queue
  send: "L1",     // YOU approve every single email before it goes out
  reply: "L1",    // YOU approve every reply draft
  schedule: "L2", // AI handles scheduling logistics
  sms: "L0",      // SMS off — not relevant for RE investor outreach
  call: "L0",     // Calls off — handle manually
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🏠 Seeding Prophet Homes configuration...\n");

  // Upsert org
  const [existingOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, ORG_SLUG))
    .limit(1);

  let org: typeof organizations.$inferSelect;

  if (existingOrg) {
    console.log(`✓ Org already exists: ${existingOrg.name} (${existingOrg.id})`);
    [org] = await db
      .update(organizations)
      .set({ autonomySettings: AUTONOMY_SETTINGS, updatedAt: new Date() })
      .where(eq(organizations.id, existingOrg.id))
      .returning();
    console.log("✓ Updated autonomy settings");
  } else {
    [org] = await db
      .insert(organizations)
      .values({
        name: ORG_NAME,
        slug: ORG_SLUG,
        autonomySettings: AUTONOMY_SETTINGS,
        physicalAddress: "Dallas, TX 75201", // required for CAN-SPAM
      })
      .returning();
    console.log(`✓ Created org: ${org.name} (${org.id})`);
  }

  // Upsert default playbook
  const [existingPlaybook] = await db
    .select()
    .from(playbooks)
    .where(eq(playbooks.orgId, org.id))
    .limit(1);

  let playbook: typeof playbooks.$inferSelect;

  if (existingPlaybook) {
    [playbook] = await db
      .update(playbooks)
      .set({ ...PLAYBOOK, updatedAt: new Date() })
      .where(eq(playbooks.id, existingPlaybook.id))
      .returning();
    console.log("✓ Updated playbook");
  } else {
    [playbook] = await db
      .insert(playbooks)
      .values({ orgId: org.id, ...PLAYBOOK })
      .returning();
    console.log("✓ Created playbook");
  }

  // Clear + recreate sequences
  const existingSeqs = await db
    .select()
    .from(sequences)
    .where(eq(sequences.orgId, org.id));

  if (existingSeqs.length > 0) {
    for (const seq of existingSeqs) {
      await db.delete(sequenceSteps).where(eq(sequenceSteps.sequenceId, seq.id));
    }
    await db.delete(sequences).where(eq(sequences.orgId, org.id));
    console.log("✓ Cleared old sequences");
  }

  // Create Sequence 1: Investor Outreach
  const [investorSeq] = await db
    .insert(sequences)
    .values({
      orgId: org.id,
      playbookId: playbook.id,
      name: INVESTOR_SEQUENCE.name,
      isActive: true,
      strategy: INVESTOR_SEQUENCE.strategy,
      tone: INVESTOR_SEQUENCE.tone,
      industryContext: INVESTOR_SEQUENCE.industryContext,
    })
    .returning();

  await db.insert(sequenceSteps).values(
    INVESTOR_SEQUENCE.steps.map((s) => ({
      sequenceId: investorSeq.id,
      stepNumber: s.stepNumber,
      delayDays: s.delayDays,
      channel: "email" as const,
      subjectTemplate: s.subjectTemplate,
      bodyTemplate: s.bodyTemplate,
    }))
  );
  console.log(`✓ Created sequence: ${INVESTOR_SEQUENCE.name} (${INVESTOR_SEQUENCE.steps.length} steps)`);

  // Create Sequence 2: Referral Partner Outreach
  const [referralSeq] = await db
    .insert(sequences)
    .values({
      orgId: org.id,
      playbookId: playbook.id,
      name: REFERRAL_SEQUENCE.name,
      isActive: true,
      strategy: REFERRAL_SEQUENCE.strategy,
      tone: REFERRAL_SEQUENCE.tone,
      industryContext: REFERRAL_SEQUENCE.industryContext,
    })
    .returning();

  await db.insert(sequenceSteps).values(
    REFERRAL_SEQUENCE.steps.map((s) => ({
      sequenceId: referralSeq.id,
      stepNumber: s.stepNumber,
      delayDays: s.delayDays,
      channel: "email" as const,
      subjectTemplate: s.subjectTemplate,
      bodyTemplate: s.bodyTemplate,
    }))
  );
  console.log(`✓ Created sequence: ${REFERRAL_SEQUENCE.name} (${REFERRAL_SEQUENCE.steps.length} steps)`);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Prophet Homes agent setup complete!

Org ID:      ${org.id}
Playbook:    ${PLAYBOOK.tone} tone · ${PLAYBOOK.sequenceStrategy} strategy
Sequences:   2 (investor outreach + referral partners)
Autonomy:    L1 send — you approve every email

Next steps:
  1. Add your DATABASE_URL to .env.local
  2. Run: pnpm db:push   (sync schema to your DB)
  3. Run: pnpm seed:prophet   (this script)
  4. Import investor contacts via the Contacts page (CSV)
  5. Enroll them in "Investor Outreach" sequence
  6. AI drafts → you review → send

Apollo ICP hint:
  Industries: Real Estate Investment, Real Estate
  Titles: investor, acquisitions, principal, syndicator
  Location: Dallas-Fort Worth TX, Austin TX
  Company size: 1–50 employees
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
