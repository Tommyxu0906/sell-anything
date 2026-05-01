/**
 * National Life Group — Life Insurance Setup
 *
 * Run: pnpm seed:nlg
 *
 * Creates the insurance playbook + four outreach sequences:
 *   1. Mortgage Protection — new homeowners (cross-sell from RE clients)
 *   2. Income Protection — young families and professionals
 *   3. Business Owner Protection — key person + buy-sell
 *   4. Chinese Family Protection — 华人家庭保障 (Mandarin/bilingual)
 *
 * Compliance note: All insurance emails are educational in tone.
 * Every draft requires human review before sending (autonomy locked to L1).
 * Never make specific premium quotes or guarantee coverage in email.
 */

import "dotenv/config";
import { db } from "../lib/db/client";
import { organizations, playbooks, sequences, sequenceSteps } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

const ORG_SLUG = "prophet-homes";

const NLG_PLAYBOOK = {
  name: "National Life Group — Life Insurance",
  isDefault: false,
  industry: "life-insurance",
  tone: "consultative" as const,
  sequenceStrategy: "nurture" as const,
  businessLine: "life_insurance",
  aiGenerated: false,

  valueProp: `Life insurance advisor at National Life Group, Greater Boston.
Specializing in helping families and business owners protect what they've built.
Products: term life, whole life, universal life, disability income, annuities, mortgage protection.
Mandarin-speaking — serving Greater Boston's Chinese community.`,

  icpDescription: `Three primary segments:
1. New homeowners (especially recent RE clients from Prophet Homes) — just took on a mortgage,
   highest urgency for protection coverage. Mortgage protection = income replacement if they die/become disabled.
2. Young families (age 28-45, dual income, children) — protecting income and building cash value.
   Often underinsured or haven't reviewed coverage since first policy.
3. Business owners — key person insurance (if owner dies, business survives), buy-sell funding,
   executive benefit programs. High premium, complex need.
4. Chinese families specifically — culturally accepting of life insurance as family protection (保障家庭),
   but often underinsured because they invest in real estate instead. Cross-sell opportunity.`,

  targetIndustries: [
    "Biotechnology / Pharmaceuticals",
    "Technology",
    "Finance / Investment Management",
    "Healthcare",
    "Higher Education / Research",
    "Small Business / Entrepreneurship",
    "Real Estate",
  ],

  targetJobTitles: [
    "Software Engineer", "Senior Engineer", "Research Scientist",
    "Physician", "Dentist", "Financial Analyst",
    "Business Owner", "Founder", "Managing Partner",
    "Professor", "Researcher",
  ],

  companySize: { min: 1, max: 500 },

  brandVoice: `Warm, educational, trusted-advisor tone. Never pushy. Never salesy.
You are helping people think through something they've been avoiding — their family's financial security.
Acknowledge that these conversations are uncomfortable. Make them easy.
Educate first, ask later. One email at a time.
For Mandarin outreach: 温暖、专业、以客户为中心。不催促，不施压。`,

  objectionHandlers: [
    {
      trigger: "I already have coverage through work",
      response: "Group coverage is a great start — typically 1-2x salary. Financial planners usually recommend 10-12x income. And it doesn't travel with you if you leave or lose your job. Worth 20 minutes to review the gap?",
    },
    {
      trigger: "I can't afford it",
      response: "A healthy 35-year-old can get $500k in term coverage for roughly the cost of a streaming subscription. Most people are surprised how affordable it is — happy to show you real numbers with no commitment.",
    },
    {
      trigger: "I'm young and healthy, I don't need it",
      response: "That's actually the best time to lock in a rate. Premiums are lowest when you're young and healthy — the same policy costs 2-3x more ten years from now. And life happens fast.",
    },
    {
      trigger: "I invest in real estate instead",
      response: "Real estate is great for building wealth — but it can't pay your mortgage if you can't work. Insurance and real estate solve different problems. A quick look at how they complement each other might be useful.",
    },
    {
      trigger: "我不太了解保险 / I don't know much about insurance",
      response: "完全理解。大多数人都觉得保险复杂。我可以用中文给您解释，从最基础的开始，不用担心术语。我们可以微信聊。(Totally understandable — I can explain everything in Mandarin, starting from the basics. WeChat works fine.)",
    },
    {
      trigger: "let me think about it",
      response: "Of course — this is a big decision. Can I send you a one-pager on the difference between term and whole life? It's a good starting point, and then you can decide if you want to dig deeper.",
    },
  ],

  caseStudies: `Client stories (anonymized):

  Biogen scientist, 38, two kids, Newton:
  Had employer group coverage of 2x salary. After review, added $1M term + disability income rider.
  Six months later, went on extended medical leave — disability policy covered 60% of income.
  "I didn't realize I was this exposed."

  Chinese couple, both MIT researchers, just bought in Lexington:
  Came as a RE referral. Neither had individual life insurance — relied on employer group plans.
  Added $800k 20-year term for each, plus mortgage protection rider. Total cost: less than a Netflix plan.
  "我们终于不用担心这个了。"

  Restaurant owner, Quincy:
  Sole proprietor. No succession plan. Added key person policy + buy-sell funding.
  Whole life builds cash value he can borrow against for business emergencies.

  (Update with real stories as you close cases)`,

  icpScoreWeights: { industry: 20, title: 30, companySize: 10, seniority: 40 },
};

// ─── Sequence 1: Mortgage Protection (cross-sell from RE clients) ─────────────

const MORTGAGE_PROTECTION_SEQ = {
  name: "Mortgage Protection — New Homeowners",
  businessLine: "life_insurance" as const,
  strategy: "balanced" as const,
  tone: "consultative" as const,
  industryContext: `Target: people who recently purchased a home — especially Prophet Homes RE clients.
This is the highest-urgency insurance trigger: they just took on a 30-year, 7-figure financial obligation.
The question to raise: "If you died or became disabled, could your family keep the house?"
Compliance: educational, no specific product promises, no premium quotes. Invite a conversation.`,
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "Quick follow-up on your new home — one thing worth considering",
      bodyTemplate: `Write a warm, low-pressure email from a financial advisor who also helped with the RE transaction (or was referred).
Congratulate them on the home purchase. Transition naturally to: "One thing most new homeowners don't think about right away is what happens to this mortgage if life takes an unexpected turn."
Offer to walk them through mortgage protection options — one 20-minute conversation.
Tone: neighbor, not salesman. Educational, not salesy. 3-4 sentences max.
CTA: "Would it be useful to spend 20 minutes on this?" Not: "Buy now."`,
    },
    {
      stepNumber: 2,
      delayDays: 8,
      subjectTemplate: "Term vs. mortgage protection — quick explanation",
      bodyTemplate: `Educational follow-up. No hard ask.
Briefly explain the difference between a traditional term life policy and a mortgage protection policy.
Key point: mortgage protection pays off the house; term life gives the family flexibility to use the money however they need. Neither is wrong — depends on the situation.
End with: "Happy to walk through which makes more sense for your situation. Completely free, no obligation."
3-4 sentences. Pure education.`,
    },
    {
      stepNumber: 3,
      delayDays: 20,
      subjectTemplate: "Still thinking about it? Here's a data point",
      bodyTemplate: `Share one concrete, non-salesy data point: e.g., "A healthy 35-year-old can get $500k in 20-year term coverage for about $25-30/month. Most people are surprised it's that affordable."
Note that employer group coverage typically ends when you change jobs — now that they're homeowners, portable coverage matters more.
Soft ask: "Happy to run a quick illustration — no commitment, just so you have the number."
2-3 sentences. One fact, one ask.`,
    },
    {
      stepNumber: 4,
      delayDays: 40,
      subjectTemplate: "Leaving this with you",
      bodyTemplate: `Final soft touch. 2 sentences.
Acknowledge that life gets busy, especially after a home purchase. Leave the door permanently open: "If you ever want to revisit the protection side, I'm always here. No rush."
Warm and genuine. No ask, no urgency. Pure long-game relationship.`,
    },
  ],
};

// ─── Sequence 2: Income Protection — Young Families ──────────────────────────

const INCOME_PROTECTION_SEQ = {
  name: "Income Protection — Young Families & Professionals",
  businessLine: "life_insurance" as const,
  strategy: "nurture" as const,
  tone: "consultative" as const,
  industryContext: `Target: dual-income families age 28-45, typically with children, in Greater Boston.
High-income professionals (biotech, tech, finance, medicine) who are often underinsured despite high earnings.
Key question: "If you couldn't work for 6-12 months, what's the plan?"
Many have group life coverage through employer (usually 1-2x salary) but no individual disability income coverage.
Education-first approach: explain the gap, then invite a needs analysis conversation.`,
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "A question most high-earners haven't answered",
      bodyTemplate: `Warm intro email. Position as a financial advisor serving Boston professionals.
Ask one question, not in a pushy way: "If your household income stopped tomorrow for 6 months, what's the plan?"
Most people have a rough answer for life insurance ("my spouse"), but not for disability (which is 3x more likely than premature death during working years).
Mention that employer disability coverage (if they have it) typically covers only 60% of base salary — no bonus, no stock comp.
CTA: "Happy to do a quick needs analysis — 20 minutes, no cost, no commitment."
3-4 sentences. Thought-provoking, not scary.`,
    },
    {
      stepNumber: 2,
      delayDays: 10,
      subjectTemplate: "Disability vs. life insurance — the one that's more likely",
      bodyTemplate: `Educational follow-up. Share one statistic: a 35-year-old is 3x more likely to become disabled for 90+ days than to die before retirement.
Most people have life insurance (even just group coverage) but no disability income policy.
If employer provides LTD: it usually covers 60% of base salary, has a 3-6 month elimination period, and ends if you change jobs.
End with: "I can show you where the gaps typically are for someone at your income level. Happy to do a quick review."
3-4 sentences. One stat, one offer.`,
    },
    {
      stepNumber: 3,
      delayDays: 22,
      subjectTemplate: "Cash value vs. term — which is right for your situation?",
      bodyTemplate: `Education on the term vs. whole life question. Keep it balanced — no hard sell on either.
Term: lower cost, pure protection, right for most 30s-40s with a specific coverage need.
Whole life / IUL: builds cash value, can be borrowed against, permanent coverage.
Frame it as: "The right answer depends on your goals — short-term income protection or long-term wealth building?"
CTA: "Happy to model both for your specific situation — takes 20 minutes."
3-4 sentences. Balanced, educational.`,
    },
    {
      stepNumber: 4,
      delayDays: 38,
      subjectTemplate: "No pressure — just want to be a resource",
      bodyTemplate: `Warm, short final touch. 2-3 sentences.
Acknowledge they're busy professionals. Note that you're here when the timing is right.
Mention: "Many of my clients reach out after a life event — new baby, promotion, mortgage, a friend's health scare. Happy to help whenever that moment comes."
Leave permanently open door. No ask.`,
    },
  ],
};

// ─── Sequence 3: Business Owner Protection ────────────────────────────────────

const BUSINESS_OWNER_SEQ = {
  name: "Business Owner Protection — Key Person & Buy-Sell",
  businessLine: "life_insurance" as const,
  strategy: "enterprise" as const,
  tone: "professional" as const,
  industryContext: `Target: small business owners, founders, and partners in Greater Boston.
Key questions: "If you died tomorrow, what happens to the business?" and "Could your partner buy out your family?"
Products: key person insurance (business owns, pays premiums, receives benefit),
buy-sell agreement funding (partners insure each other), executive disability income.
These are complex, multi-stakeholder conversations — takes time. Educational approach, then invite a deep dive.
Note: often cross-sell from RE clients who own businesses.`,
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "A question for business owners that most avoid",
      bodyTemplate: `Warm intro email to a business owner. Position as an advisor who works with Boston-area business owners.
Ask the hard question gently: "If you or your business partner died or became disabled tomorrow, what happens to the business?"
Most business owners have personal life insurance but haven't thought about the business continuity question.
Mention that key person insurance and buy-sell funding are the two most common tools — and most business owners haven't addressed either.
CTA: "Happy to walk through the options — 30-minute conversation, no cost."
3-4 sentences. Thought-provoking. Not scary.`,
    },
    {
      stepNumber: 2,
      delayDays: 12,
      subjectTemplate: "Key person insurance — what it is and when it matters",
      bodyTemplate: `Educational deep-dive on key person insurance.
Simple explanation: business owns the policy on a key person (owner, partner, top producer). If that person dies, the business receives a tax-free benefit to replace them, pay down debt, or reassure clients and investors.
Use a simple hypothetical: "If your company's revenue is driven by one or two people, a bank or investor will often ask: how is that insured?"
CTA: "Happy to explain how this typically works for a business like yours — no commitment, just information."
3-4 sentences.`,
    },
    {
      stepNumber: 3,
      delayDays: 25,
      subjectTemplate: "Buy-sell agreements — the piece most partners skip",
      bodyTemplate: `Education on buy-sell funding. Keep it accessible.
Simple question: "If your business partner died, would you want to run the business with their spouse or family? And could they afford to buy your share?"
Buy-sell agreements funded by life insurance solve this cleanly: each partner insures the other, and the benefit funds the buyout at a pre-agreed price.
Without it: surviving partners often end up in costly disputes with heirs.
CTA: "Happy to walk through how a couple of Boston businesses have structured this — takes about 30 minutes."`,
    },
    {
      stepNumber: 4,
      delayDays: 45,
      subjectTemplate: "Still here when you're ready",
      bodyTemplate: `Short, warm final touch for business owners. 2 sentences.
Acknowledge that business owners are busy and these decisions take time.
Leave permanent open door: "These conversations are most valuable before they become urgent. Happy to reconnect whenever the timing is right."
No pressure. Genuine advisory relationship framing.`,
    },
  ],
};

// ─── Sequence 4: Chinese Family Protection (华人家庭保障) ────────────────────

const CHINESE_FAMILY_SEQ = {
  name: "华人家庭保障 — Chinese Family Protection",
  businessLine: "life_insurance" as const,
  strategy: "nurture" as const,
  tone: "consultative" as const,
  industryContext: `Target: Chinese and Chinese-American families in Greater Boston — especially those who:
1. Are new immigrants / recent arrivals who haven't set up US financial protection
2. Are real estate investors who have significant assets but no income protection
3. Have children in US schools or planning to send children to US colleges
Key cultural insight: Chinese families are deeply protective of family — 保障家庭 resonates.
They often invest heavily in real estate (资产) but neglect income/life protection.
Many assume US employer benefits are sufficient — they usually are not.
Emails should be BILINGUAL — English with a meaningful Chinese section (not just a note).
Approach: family-first framing, education, patience. Trust comes before any ask.`,
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "Financial protection for your family in the US — 华人家庭保障",
      bodyTemplate: `Write a BILINGUAL email (English body, then --- divider, then substantive Chinese section).
From: a Mandarin-speaking financial advisor / insurance specialist in Boston.
English: Warm intro. Mention that many Chinese families in Boston have done well building real estate wealth,
but often haven't set up income or life protection in the US. Note that US insurance works very differently from China.
Offer: "Happy to walk through what most Chinese families in Boston have in place — and what's typically missing."
Chinese section (after ---): 3-4 sentences in natural Simplified Chinese.
Something like: 很多在波士顿的华人家庭在资产方面做得很好，但人寿保险和收入保障方面往往有很大的缺口。
我是会普通话的金融顾问，专门帮助华人家庭了解美国的保险体系。如果您有兴趣，我可以用中文详细解释。
CTA: One soft question — "Have you reviewed your family's protection coverage since arriving in the US?"`,
    },
    {
      stepNumber: 2,
      delayDays: 10,
      subjectTemplate: "美国人寿保险和中国的区别 — Key differences from China",
      bodyTemplate: `Bilingual educational email.
English: Explain 2-3 key differences between US and Chinese life insurance:
1. US life insurance proceeds are generally income-tax-free (unlike some Chinese products)
2. Whole life builds cash value you can borrow against — many Chinese families use it as a savings vehicle
3. Employer group coverage disappears when you leave the job — individual policies travel with you
Chinese section: 中美保险的主要区别简述。具体说明：美国的寿险赔付一般免所得税；终身寿险的现金价值可以作为储蓄或紧急资金；单位团体保险随工作结束而失效，个人保单则不同。
CTA: "Happy to explain any of this in more detail — in Chinese or English, whatever's easier."`,
    },
    {
      stepNumber: 3,
      delayDays: 22,
      subjectTemplate: "孩子的教育金 + 家庭保障 — Education fund + family protection",
      bodyTemplate: `Bilingual email on a topic that resonates deeply: children's education and family legacy.
English: Many Chinese families are focused on building real estate wealth for their children.
Life insurance can play a parallel role: a whole life or IUL policy started early builds cash value
that can fund college, while also protecting the family if income stops unexpectedly.
Some Boston Chinese parents start policies for young children too — the cash value compounds over 18 years.
Chinese section: 很多华人父母非常重视孩子的教育。终身寿险或IUL保险不仅能保障家庭，
也可以作为教育金的储备——孩子上大学时可以使用保单的现金价值。
如果提前规划，复利效果非常可观。我可以用中文给您演示一个具体的方案。
CTA: "Happy to model this out for your family's specific situation — 20-30 minutes over WeChat or phone."`,
    },
    {
      stepNumber: 4,
      delayDays: 38,
      subjectTemplate: "随时欢迎联系 — Here whenever you're ready",
      bodyTemplate: `Short warm bilingual final touch.
English: 2 sentences. Acknowledge timing matters. Leave door permanently open.
"Insurance conversations are best had before they're urgent — whenever you're ready, I'm here."
Chinese section: 保险的事不急，但提前了解总是好的。有任何问题，欢迎随时用中文联系我，也可以微信。
Genuine warmth. No pressure. No ask.`,
    },
    {
      stepNumber: 5,
      delayDays: 60,
      subjectTemplate: "Spring reminder — 一年一度的保障检查",
      bodyTemplate: `Bilingual annual check-in (long-cycle final step).
English: 2-3 sentences. "Many of my clients do a quick financial protection review once a year — it takes 20 minutes and often surfaces something worth addressing."
Life changes fast: new baby, promotion, new mortgage, approaching college tuition — each one changes the right coverage.
Chinese section: 每年做一次家庭保障检查是个好习惯。生活变化很快——新生儿、换工作、买房——每一项都可能改变您需要的保额。
如果您愿意，我可以帮您做一个快速的中文检查，完全免费。
CTA: "Happy to do a quick 20-minute review — no commitment, just clarity."`,
    },
  ],
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🛡️  Seeding National Life Group insurance configuration...\n");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, ORG_SLUG))
    .limit(1);

  if (!org) {
    console.error("❌ Prophet Homes org not found. Run `pnpm seed:prophet` first.");
    process.exit(1);
  }

  console.log(`✓ Found org: ${org.name} (${org.id})`);

  // Create or update NLG playbook
  const [existing] = await db
    .select()
    .from(playbooks)
    .where(and(eq(playbooks.orgId, org.id), eq(playbooks.industry, "life-insurance")))
    .limit(1);

  let playbook: typeof playbooks.$inferSelect;

  if (existing) {
    [playbook] = await db
      .update(playbooks)
      .set({ ...NLG_PLAYBOOK, updatedAt: new Date() })
      .where(eq(playbooks.id, existing.id))
      .returning();
    console.log("✓ Updated NLG playbook");
  } else {
    [playbook] = await db
      .insert(playbooks)
      .values({ orgId: org.id, ...NLG_PLAYBOOK })
      .returning();
    console.log("✓ Created NLG playbook");
  }

  // Remove and re-create insurance sequences
  const existingSeqs = await db
    .select()
    .from(sequences)
    .where(and(eq(sequences.orgId, org.id), eq(sequences.playbookId, playbook.id)));

  for (const seq of existingSeqs) {
    await db.delete(sequenceSteps).where(eq(sequenceSteps.sequenceId, seq.id));
  }
  await db.delete(sequences).where(and(eq(sequences.orgId, org.id), eq(sequences.playbookId, playbook.id)));

  for (const seqDef of [MORTGAGE_PROTECTION_SEQ, INCOME_PROTECTION_SEQ, BUSINESS_OWNER_SEQ, CHINESE_FAMILY_SEQ]) {
    const [seq] = await db.insert(sequences).values({
      orgId: org.id,
      playbookId: playbook.id,
      name: seqDef.name,
      isActive: true,
      businessLine: seqDef.businessLine,
      strategy: seqDef.strategy,
      tone: seqDef.tone,
      industryContext: seqDef.industryContext,
    }).returning();

    await db.insert(sequenceSteps).values(
      seqDef.steps.map((s) => ({
        sequenceId: seq.id,
        stepNumber: s.stepNumber,
        delayDays: s.delayDays,
        channel: "email" as const,
        subjectTemplate: s.subjectTemplate,
        bodyTemplate: s.bodyTemplate,
      }))
    );

    console.log(`✓ Created: ${seqDef.name} (${seqDef.steps.length} steps)`);
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  National Life Group setup complete!

Insurance sequences created:
  1. Mortgage Protection — New Homeowners (4 steps / 40 days)
     Cross-sell trigger: every Prophet Homes RE closing → add to this sequence

  2. Income Protection — Young Families & Professionals (4 steps / 38 days)
     Target: Boston biotech/tech/finance professionals age 28-45

  3. Business Owner Protection — Key Person & Buy-Sell (4 steps / 45 days)
     Target: Small business owners, founders, partners

  4. 华人家庭保障 — Chinese Family Protection (5 steps / 60 days)
     Bilingual outreach — pairs with Boston Chinese RE sequences

Compliance reminders:
  ⚠️  All insurance drafts require human review before sending (L1 autonomy)
  ⚠️  Never quote specific premiums in email — invite a conversation
  ⚠️  Never guarantee coverage or underwriting outcomes
  ⚠️  State licensing applies — you're a licensed NLG agent

Cross-sell workflow:
  RE closing → tag contact with businessLine=life_insurance → enroll in Mortgage Protection
  Boston Chinese RE lead → also enroll in 华人家庭保障 sequence
  Business owner RE buyer → also enroll in Business Owner Protection

Run the app: pnpm dev
Settings → Life Insurance tab to edit the NLG playbook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
