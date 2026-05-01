/**
 * Boston Chinese Market — Personal Agent Setup
 *
 * Run once (in addition to seed-prophet.ts, or standalone):
 *   pnpm seed:boston
 *
 * Sets up three outreach tracks for Greater Boston's Chinese community:
 *   - Track 1: Chinese Investor Outreach (bilingual — Boston RE investment thesis)
 *   - Track 2: New Arrival School District Buyers (Mandarin — Lexington/Newton/Brookline)
 *   - Track 3: Community Referral Network (English — Chinese professionals who refer)
 *
 * Also creates: WeChat message templates (for manual community outreach)
 */

import "dotenv/config";
import { db } from "../lib/db/client";
import {
  organizations,
  playbooks,
  sequences,
  sequenceSteps,
} from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

const ORG_SLUG = "prophet-homes";

// ─── Boston Chinese Market Playbook ──────────────────────────────────────────

const BOSTON_PLAYBOOK = {
  name: "Boston Chinese Market — Investor & Buyer Playbook",
  isDefault: false,
  industry: "commercial-real-estate",
  tone: "consultative" as const,
  sequenceStrategy: "nurture" as const,
  aiGenerated: false,

  valueProp: `Greater Boston real estate agent at Prophet Homes. Mandarin-speaking (普通话).
Specializing in helping Chinese families and investors navigate Boston's housing market —
top school districts (Lexington, Newton, Brookline, Belmont), investment properties near universities,
and off-market opportunities for investors seeking long-term appreciation in a supply-constrained market.`,

  icpDescription: `Chinese-American professionals and new immigrant Chinese families in Greater Boston.
Two sub-segments:
1. Investors: Chinese professionals (biotech, tech, finance, academia) or business owners in Boston who have
   capital and understand real estate as wealth-building. Looking to buy investment properties near
   MIT/Harvard/BU or in top school districts. May also be interested in referring family moving to Boston.
2. School District Buyers: Newly arrived or planning-to-arrive Chinese families who prioritize
   Lexington, Newton, Brookline, Belmont, Weston, or Winchester for their children's education.
   They understand what great schools mean for property values from their experience in China.`,

  targetIndustries: [
    "Biotechnology",
    "Pharmaceuticals",
    "Higher Education / Research",
    "Technology",
    "Finance / Investment Management",
    "Healthcare",
    "Architecture / Engineering",
  ],

  targetJobTitles: [
    "Research Scientist",
    "Principal Scientist",
    "Professor",
    "Software Engineer",
    "Senior Engineer",
    "Financial Analyst",
    "Portfolio Manager",
    "Physician",
    "Business Owner",
    "Managing Director",
  ],

  companySize: { min: 1, max: 10000 },

  brandVoice: `Warm, knowledgeable, trustworthy. You are a neighbor and advisor, not a salesperson.
For Chinese-speaking prospects: communicate in natural, professional Mandarin. Avoid stiff translated language.
Reference shared cultural understanding of real estate as generational wealth (不动产).
Never push — earn trust first, ask later. One conversation at a time.
For English outreach: approachable professional, bilingual capability mentioned naturally.`,

  objectionHandlers: [
    {
      trigger: "Boston market is too expensive",
      response:
        "That's exactly what people said about Pudong in 2005 and West Lake in 2010. Boston's supply is structurally constrained — Harvard, MIT, 50+ hospitals, and strict zoning mean demand always outpaces supply. The best time was 20 years ago. Second best is now.",
    },
    {
      trigger: "I'm waiting for the market to drop",
      response:
        "In 30 years, Boston home prices have never had a sustained multi-year decline. The school district premium is structural — families will always pay for Lexington and Newton schools. Timing the market here is very hard. Timing your entry to your life stage is easier.",
    },
    {
      trigger: "interest rates are high",
      response:
        "Rates affect monthly payment, not asset value. Boston's appreciation over 5+ years consistently outpaces the rate premium. And rental yields near universities cover a significant portion of carrying costs. Many investors buy cash, refinance later.",
    },
    {
      trigger: "I'm not sure about being a landlord",
      response:
        "Totally valid concern. Many of my clients start with a property near BU or Northeastern where student rental demand is extremely stable. I can connect you with property managers who handle everything — you collect a check.",
    },
    {
      trigger: "我还没准备好 / not ready yet",
      response:
        "完全理解。买房是大事，不用急。我可以先给你发一些市场资料，等你准备好了，我们再聊。" +
        " (Completely understood — no rush. Let me share some market info. When you're ready, we'll talk.)",
    },
    {
      trigger: "how are you different from other agents",
      response:
        "I speak Mandarin, I know this community, and I specialize in the school district towns. I understand why a Chinese family picks Lexington over Winchester, and I know which streets in Newton have the best resale trajectory. That's the difference.",
    },
  ],

  caseStudies: `Recent client stories (anonymized):

  Shanghai family, moved to Lexington for daughter's high school:
  Bought 4BR on a top-ranked elementary school feeder street. Child is now at a top university.
  Home appreciated 34% in 6 years. Family now asking about a rental property near MIT.

  Beijing couple, both researchers at Biogen:
  Bought 3BR condo in Brookline near Coolidge Corner. Rents entire unit during sabbatical year — strong yield.
  Now looking at a 2-unit in Brighton as long-term investment.

  Investor from Shenzhen (introduced via WeChat community group):
  Bought 2-family in Allston near Boston University. Both units rented to international grad students.
  Cap rate: ~6.2%. Stable occupancy. Converted to LLC for tax purposes.

  (Update with real stories as relationships develop)`,

  icpScoreWeights: {
    industry: 30,
    title: 35,
    companySize: 10,
    seniority: 25,
  },
};

// ─── Track 1: Chinese Investor Outreach (Bilingual) ──────────────────────────

const INVESTOR_SEQUENCE = {
  name: "Boston Chinese Investor Outreach — 华人投资者",
  strategy: "balanced" as const,
  tone: "consultative" as const,
  industryContext: `Target: Chinese-American professionals (biotech, tech, finance, academia) and Chinese business owners
in Greater Boston who have investable capital and understand real estate. Many have experienced China's
real estate boom and are culturally predisposed to real estate as wealth-building.
Key messages: supply-demand fundamentals, university rental yield, school district appreciation, long-term hold.
Emails should be BILINGUAL — English first, then a short Chinese (Simplified) section.
The agent speaks fluent Mandarin — this is a key trust signal to include naturally.`,
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "Boston real estate — an investor's perspective",
      bodyTemplate: `Write a bilingual intro email (English + brief Chinese section after ---).
From: a Mandarin-speaking real estate agent at Prophet Homes in Greater Boston.
To: a Chinese-American professional (biotech/tech/finance/academia) in Boston area.
Goal: introduce yourself as a Mandarin-speaking agent who focuses on investment properties near universities
and in top school districts. Ask if they've thought about Boston real estate as part of their investment portfolio.
English section: 3-4 sentences, warm and professional. Mention Mandarin capability naturally.
Chinese section (after ---): 2-3 sentences in Simplified Chinese. Something like: 如果您更习惯用中文交流，我们可以用普通话沟通。
Include ONE soft question — not a meeting ask, just "have you looked at Boston as an investment market?"
Tone: advisor-to-advisor, not sales.`,
    },
    {
      stepNumber: 2,
      delayDays: 5,
      subjectTemplate: "The Boston supply problem (and why it matters for investors)",
      bodyTemplate: `Bilingual follow-up. Reference that you reached out last week.
English: Share ONE concrete insight about Boston's supply constraint (e.g., Lexington issued fewer than 50 new housing permits last year; Harvard/MIT anchor demand that never leaves the market). Make it feel like advisor insight, not a pitch.
Chinese section: 1-2 sentences max — something like "波士顿的学区房和上海2005年浦东的情况很像——需求远大于供给。"
Ask: "Would it be useful if I sent you a quick breakdown of which neighborhoods have the best rental yield?"
Keep it short — 3 sentences English + Chinese note.`,
    },
    {
      stepNumber: 3,
      delayDays: 12,
      subjectTemplate: "Quick question — [first name]",
      bodyTemplate: `Short bilingual follow-up. Reference the prior emails briefly.
English: 2 sentences. Offer to share a specific deal case study (2-family near BU, condo near MGH, etc.) to make the opportunity concrete. Frame it as "takes 2 minutes to read."
Chinese: 一两句话。"我可以分享一个最近的案例，如果您感兴趣的话。"
Single ask: "Want me to send it over?"`,
    },
    {
      stepNumber: 4,
      delayDays: 25,
      subjectTemplate: "Last note — staying in your corner",
      bodyTemplate: `Final bilingual touch. Very soft.
English: 2 sentences. Acknowledge timing might not be right. Leave the door open permanently — "if you ever want to explore Boston real estate as an investment or know someone who's looking, I'm here."
Chinese: "如果将来有需要，随时欢迎联系。" (If there's ever a need in the future, feel free to reach out anytime.)
No ask. No pressure. Genuine warmth.`,
    },
  ],
};

// ─── Track 2: New Arrival School District Buyers (Mandarin) ──────────────────

const SCHOOL_BUYER_SEQUENCE = {
  name: "New Arrival School District Buyers — 新移民家庭学区房",
  strategy: "nurture" as const,
  tone: "consultative" as const,
  industryContext: `Target: Chinese families who are new to Boston or planning to relocate — moving for a job, university position,
or specifically for their children's education. They want to be in Lexington, Newton, Brookline, Belmont,
Weston, or Winchester. They have real estate experience from China and take property buying seriously.
Emails should be primarily in Mandarin (Simplified Chinese). They may have limited English comfort.
Key value: you speak their language, know the school districts deeply, and understand their priorities
(好学区, 安全, 方便, 升值空间 — good schools, safety, convenience, appreciation potential).`,
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "波士顿学区房 — 给新来家庭的指南",
      bodyTemplate: `Write this email ENTIRELY IN SIMPLIFIED CHINESE (Mandarin).
From: a Mandarin-speaking real estate agent at Prophet Homes, Greater Boston.
To: a Chinese family that has recently moved to Boston or is planning to move.
Goal: introduce yourself as a Mandarin-speaking local agent who specializes in helping Chinese families
find homes in the best Boston school districts. Position as a resource and advisor, not a salesperson.
Mention the top school districts by name: Lexington (列克星顿), Newton (牛顿), Brookline (布鲁克兰),
Belmont (贝尔蒙特), Weston (韦斯顿), Winchester (温彻斯特).
Reference that you understand what a good school means — shared cultural value.
Soft ask: "我可以给您发一份各学区的对比资料，您有兴趣吗？" (Can I send you a comparison of school districts?)
3-4 sentences. Warm, not pushy. Like a helpful neighbor.`,
    },
    {
      stepNumber: 2,
      delayDays: 7,
      subjectTemplate: "列克星顿 vs 牛顿 — 学区对比",
      bodyTemplate: `Entirely in Simplified Chinese.
Follow-up. Reference last email. Share a concrete comparison between Lexington and Newton school districts —
mention GreatSchools ratings, MCAS scores if known, average school ranking. Keep it factual and useful.
Add: 买学区房除了孩子教育，房产本身的增值空间也非常稳定，因为这个需求是持续的。
(Beyond education, school district homes have very stable appreciation because demand is consistent.)
Reference your availability for a 中文电话 (Mandarin phone call) or WeChat call.
Ask: "您目前大概预算在什么范围？" (What's roughly your budget range?)
4-5 sentences. Informative + one soft question.`,
    },
    {
      stepNumber: 3,
      delayDays: 16,
      subjectTemplate: "最近有一套 Lexington 的房子 — 适合您吗？",
      bodyTemplate: `Entirely in Simplified Chinese.
Mention you have a current listing or recent comp in Lexington (or whichever district fits).
Keep it brief — describe it in 2-3 sentences: 卧室数量, 学区, 大致价格范围.
Ask: "这类房子是您在考虑的范围吗？我可以安排中文讲解的看房。"
(Is this the kind of home you're considering? I can arrange a Mandarin-language showing.)
Keep it SHORT. Chinese buyers appreciate directness once trust is established.`,
    },
    {
      stepNumber: 4,
      delayDays: 30,
      subjectTemplate: "波士顿买房流程 — 中文说明",
      bodyTemplate: `Entirely in Simplified Chinese.
Offer to walk them through the Boston home buying process in Chinese — offer letter (出价信),
inspection (房屋检查), mortgage (贷款), closing (过户). Mention that the process is different from China
and you can explain everything in Mandarin.
This is pure value-add — not a sales ask.
End with: "如果您有任何问题，欢迎用中文联系我，也可以微信。" (Feel free to reach out in Chinese, including WeChat.)
Warmth + practical help. 4-5 sentences.`,
    },
    {
      stepNumber: 5,
      delayDays: 50,
      subjectTemplate: "长期保持联系 — 随时欢迎",
      bodyTemplate: `Entirely in Simplified Chinese. Very soft final touch.
Acknowledge that buying a home is a big decision that takes time.
Note that you're always available when they're ready.
Reference that many of your Chinese clients come back to you after months of research — no rush.
Leave a genuine, warm open door: "波士顿这边有任何关于房产的问题，随时可以联系我。"
2-3 sentences. No ask. Pure long-game relationship.`,
    },
  ],
};

// ─── Track 3: Community Referral Network (English) ───────────────────────────

const REFERRAL_SEQUENCE = {
  name: "Chinese Community Referral Network — 华人社区推荐",
  strategy: "nurture" as const,
  tone: "casual" as const,
  industryContext: `Target: Chinese-American professionals and community connectors in Greater Boston who are well-networked
and might refer families or investors. This includes Chinese-American professors, community organization leaders,
Chinese church members, Chinese professional association members (e.g. CAPPA Boston, CAUSE Boston),
and other agents/professionals who serve the Chinese community.
Goal: become the go-to Mandarin-speaking real estate contact for their network.
English emails are fine here — these are typically well-integrated Chinese-Americans.
Tone: warm, collegial, peer-to-peer. Not transactional.`,
  steps: [
    {
      stepNumber: 1,
      delayDays: 0,
      subjectTemplate: "Mandarin-speaking RE agent in Boston — good to connect",
      bodyTemplate: `English email. Warm, collegial intro.
From: a Mandarin-speaking real estate agent at Prophet Homes, Greater Boston.
To: a well-networked Chinese-American professional in Boston.
Goal: introduce yourself as a Mandarin-speaking agent who specializes in helping Chinese families
buy in the right school districts and helping Chinese investors find Boston real estate opportunities.
Ask: "Do you ever come across Chinese families or professionals who are trying to navigate the Boston housing market?
I'd love to be a resource you can point them to."
3-4 sentences. Collegial, not transactional. Like a professional peer reaching out.`,
    },
    {
      stepNumber: 2,
      delayDays: 12,
      subjectTemplate: "Quick follow-up — happy to be a resource",
      bodyTemplate: `English, short. Reference last email.
2-3 sentences. Mention you help families understand school districts, and investors find stable yield near universities.
Offer: "Happy to send a quick one-pager if it's ever useful to share with your network."
No ask for a call. Pure resource offer.`,
    },
    {
      stepNumber: 3,
      delayDays: 30,
      subjectTemplate: "Something useful — Boston school district guide",
      bodyTemplate: `English. Offer something of genuine value to their community.
Mention you've put together a guide to Boston's top Chinese-family-friendly school districts
(Lexington, Newton, Brookline, Belmont) — it covers school ratings, commute times, typical home prices,
and Chinese community presence in each town.
Offer to share it: "Happy to send it over — it's useful to have when friends or colleagues ask."
2-3 sentences. Pure value. No ask.`,
    },
    {
      stepNumber: 4,
      delayDays: 55,
      subjectTemplate: "Staying in touch",
      bodyTemplate: `English. Very short, warm final touch.
2 sentences. You're happy to be a resource for anyone in their network looking for a Mandarin-speaking agent.
Leave permanent open door: "Feel free to pass along my name if it ever comes up — 我说普通话。"
Warm, genuine, community-oriented.`,
    },
  ],
};

// ─── WeChat Templates (for manual community outreach) ───────────────────────

const WECHAT_TEMPLATES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WECHAT MESSAGE TEMPLATES — BOSTON CHINESE COMMUNITY
(Copy, personalize, paste manually — WeChat cannot be automated)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

──────────────────────────────────────────
1. INITIAL SELF-INTRODUCTION (to a new contact or group)
──────────────────────────────────────────
大家好！我叫[Your Name]，是波士顿地区的华人房产经纪人，在Prophet Homes工作。
我专门帮助华人家庭在波士顿找学区房（列克星顿、牛顿、布鲁克兰等），
也帮有兴趣的朋友在大学附近买投资房。
如果有任何买房、卖房或投资的问题，欢迎直接私信我，完全免费咨询，普通话交流！🏡

English: Hi all, I'm [Name], a Mandarin-speaking real estate agent at Prophet Homes in Greater Boston.
I specialize in helping Chinese families find homes in top school districts and helping investors find
opportunities near universities. Feel free to DM me — happy to chat in Mandarin, no pressure. 🏡

──────────────────────────────────────────
2. SCHOOL DISTRICT INFO SHARE (value-first, no ask)
──────────────────────────────────────────
最近整理了一份波士顿各学区的对比资料：
📚 列克星顿 (Lexington) — GreatSchools评分9-10分，均价约$130万
📚 牛顿 (Newton) — 评分8-10分，交通便利，均价约$110万
📚 布鲁克兰 (Brookline) — 评分9分，紧靠Boston，均价约$155万
📚 贝尔蒙特 (Belmont) — 评分9分，价格相对合理，均价约$105万
📚 温彻斯特 (Winchester) — 评分9分，安静，均价约$95万
有需要了解更多的朋友可以私信我，可以用中文详细介绍！

──────────────────────────────────────────
3. INVESTMENT THESIS SHARE (for investor-oriented groups)
──────────────────────────────────────────
分享一个观察：很多在中国经历过房地产增值的朋友来到波士顿后发现，
这里的供需结构和2005年前后的上海浦东非常像——
哈佛、MIT、50多家医院形成了永久性的需求锚，但新建住宅极少。
过去20年，列克星顿、牛顿这些学区的房价年均增长约5-7%，
加上租金收入（大学附近租金需求非常稳定），总回报相当可观。
如果有朋友在考虑美国房产投资，欢迎交流🙏我是华人经纪，普通话沟通。

──────────────────────────────────────────
4. DIRECT MESSAGE TO A NEW CONTACT (after meeting at an event)
──────────────────────────────────────────
[Name]你好！很高兴认识你。
我是[Your Name]，做波士顿地区房产的，专门帮华人家庭买学区房和投资房。
如果你或者你的朋友将来有任何关于波士顿房产的问题，欢迎随时联系我。
我们可以中文交流，完全没有压力😊

──────────────────────────────────────────
5. REFERRAL REQUEST (after a good conversation)
──────────────────────────────────────────
[Name]你好！很感谢上次的交流。
如果你身边有华人朋友在考虑在波士顿买房或者投资，欢迎把我介绍给他们。
我专注这个市场，懂学区，也懂华人家庭的需求。
有成交的话，我会给介绍人一份感谢礼🙏

──────────────────────────────────────────
TIPS FOR WECHAT COMMUNITY OUTREACH:
• Lead with value (school data, market insight) — never open with "I'm an agent looking for clients"
• Share content 2-3x before making any ask
• Join: Boston华人生活群, 波士顿华人家长群, 大波士顿华人圈, Chinese professional groups on WeChat
• Always respond quickly — WeChat culture expects fast replies
• Follow up in-person at: Chinese New Year events, temple gatherings, Chinese school (中文学校) parent events,
  Chinese professional association events (CAPPA Boston, Boston Asian MBA Assoc.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🏠 Seeding Boston Chinese Market configuration...\n");

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

  // Create Boston Chinese playbook (secondary, not default)
  const [existingBoston] = await db
    .select()
    .from(playbooks)
    .where(and(eq(playbooks.orgId, org.id), eq(playbooks.name, BOSTON_PLAYBOOK.name)))
    .limit(1);

  let playbook: typeof playbooks.$inferSelect;

  if (existingBoston) {
    [playbook] = await db
      .update(playbooks)
      .set({ ...BOSTON_PLAYBOOK, updatedAt: new Date() })
      .where(eq(playbooks.id, existingBoston.id))
      .returning();
    console.log("✓ Updated Boston Chinese playbook");
  } else {
    [playbook] = await db
      .insert(playbooks)
      .values({ orgId: org.id, ...BOSTON_PLAYBOOK })
      .returning();
    console.log("✓ Created Boston Chinese playbook");
  }

  // Remove existing Boston sequences if re-seeding
  const existingSeqs = await db
    .select()
    .from(sequences)
    .where(and(eq(sequences.orgId, org.id), eq(sequences.playbookId, playbook.id)));

  for (const seq of existingSeqs) {
    await db.delete(sequenceSteps).where(eq(sequenceSteps.sequenceId, seq.id));
  }
  await db.delete(sequences).where(and(eq(sequences.orgId, org.id), eq(sequences.playbookId, playbook.id)));

  // Sequence 1: Chinese Investor Outreach
  const [investorSeq] = await db.insert(sequences).values({
    orgId: org.id,
    playbookId: playbook.id,
    name: INVESTOR_SEQUENCE.name,
    isActive: true,
    strategy: INVESTOR_SEQUENCE.strategy,
    tone: INVESTOR_SEQUENCE.tone,
    industryContext: INVESTOR_SEQUENCE.industryContext,
  }).returning();

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
  console.log(`✓ Created: ${INVESTOR_SEQUENCE.name} (${INVESTOR_SEQUENCE.steps.length} steps)`);

  // Sequence 2: School District Buyers (Mandarin)
  const [schoolSeq] = await db.insert(sequences).values({
    orgId: org.id,
    playbookId: playbook.id,
    name: SCHOOL_BUYER_SEQUENCE.name,
    isActive: true,
    strategy: SCHOOL_BUYER_SEQUENCE.strategy,
    tone: SCHOOL_BUYER_SEQUENCE.tone,
    industryContext: SCHOOL_BUYER_SEQUENCE.industryContext,
  }).returning();

  await db.insert(sequenceSteps).values(
    SCHOOL_BUYER_SEQUENCE.steps.map((s) => ({
      sequenceId: schoolSeq.id,
      stepNumber: s.stepNumber,
      delayDays: s.delayDays,
      channel: "email" as const,
      subjectTemplate: s.subjectTemplate,
      bodyTemplate: s.bodyTemplate,
    }))
  );
  console.log(`✓ Created: ${SCHOOL_BUYER_SEQUENCE.name} (${SCHOOL_BUYER_SEQUENCE.steps.length} steps)`);

  // Sequence 3: Community Referral Network
  const [referralSeq] = await db.insert(sequences).values({
    orgId: org.id,
    playbookId: playbook.id,
    name: REFERRAL_SEQUENCE.name,
    isActive: true,
    strategy: REFERRAL_SEQUENCE.strategy,
    tone: REFERRAL_SEQUENCE.tone,
    industryContext: REFERRAL_SEQUENCE.industryContext,
  }).returning();

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
  console.log(`✓ Created: ${REFERRAL_SEQUENCE.name} (${REFERRAL_SEQUENCE.steps.length} steps)`);

  // Print WeChat templates to terminal
  console.log(WECHAT_TEMPLATES);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Boston Chinese Market setup complete!

Sequences created:
  1. ${INVESTOR_SEQUENCE.name}
     → Bilingual (English + 中文)
     → 4 emails over 25 days
     → For: Chinese-American professionals with investment capital

  2. ${SCHOOL_BUYER_SEQUENCE.name}
     → 全中文 (All Mandarin)
     → 5 emails over 50 days
     → For: New immigrant families seeking top school districts

  3. ${REFERRAL_SEQUENCE.name}
     → English
     → 4 emails over 55 days
     → For: Well-networked Chinese-Americans who refer clients

Language feature:
  Set contact.preferredLanguage = 'mandarin' → AI drafts in Chinese
  Set contact.preferredLanguage = 'bilingual' → English + 中文 section
  Set contact.preferredLanguage = 'english' → English only

Apollo prospecting strategy:
  Location: Lexington MA, Newton MA, Brookline MA, Belmont MA,
            Cambridge MA, Boston MA (02139, 02142, 02445, 02420)
  Industries: Biotechnology, Pharmaceuticals, Research, Higher Education,
              Computer Software, Financial Services, Hospital & Health Care
  Companies: MIT, Harvard, Boston University, Northeastern,
             Biogen, Novartis, Pfizer Cambridge, Moderna,
             Fidelity, State Street, Wellington, Mass General Hospital

Suggested workflow:
  1. Export LinkedIn connections → import CSV → enroll in investor sequence
  2. Chinese-American families → enroll in school district sequence (set language=mandarin)
  3. Community connectors → enroll in referral sequence
  4. WeChat: use templates above for community groups (manual, not automated)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
