export interface IndustryPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  icp: {
    industries: string[];
    jobTitles: string[];
    companySizeLabel: string;
    companySizeRange: { min: number; max: number };
    icpDescription: string;
  };
  tone: "professional" | "consultative" | "direct" | "casual" | "challenger";
  strategy: "aggressive" | "balanced" | "nurture" | "enterprise";
  sampleValueProp: string;
  brandVoice: string;
  sampleObjections: Array<{ trigger: string; response: string }>;
  apolloFilters: Record<string, unknown>;
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: "saas",
    label: "B2B SaaS",
    emoji: "💻",
    description: "Software products sold to businesses",
    icp: {
      industries: ["Technology", "SaaS", "Software"],
      jobTitles: ["VP Sales", "Head of Revenue", "CRO", "Director of Sales", "VP Growth"],
      companySizeLabel: "50–500 employees",
      companySizeRange: { min: 50, max: 500 },
      icpDescription: "B2B SaaS companies with a dedicated sales team, $1M–$20M ARR, selling complex software to enterprise or mid-market buyers.",
    },
    tone: "direct",
    strategy: "aggressive",
    sampleValueProp: "We help SaaS sales teams [outcome] by [mechanism], without [pain].",
    brandVoice: "Direct, smart, peer-to-peer. No fluff. Like talking to a sharp colleague, not a vendor.",
    sampleObjections: [
      { trigger: "not the right time", response: "Totally fair — when is a good time to revisit? I can put a reminder in my calendar." },
      { trigger: "we already have a solution", response: "Happy to hear it. Most of our customers had one too — what made them switch was [X]. Worth 15 min?" },
    ],
    apolloFilters: { industries: ["Computer Software", "Internet"], minEmployees: 50, maxEmployees: 500 },
  },
  {
    id: "marketing-agency",
    label: "Marketing Agency",
    emoji: "🎯",
    description: "Selling services to brands and businesses",
    icp: {
      industries: ["E-commerce", "DTC", "Retail", "Consumer Goods"],
      jobTitles: ["CMO", "VP Marketing", "Head of Growth", "Director of Marketing", "Founder"],
      companySizeLabel: "20–300 employees",
      companySizeRange: { min: 20, max: 300 },
      icpDescription: "E-commerce or DTC brands with $5M–$100M revenue, running paid media or content, looking to scale customer acquisition.",
    },
    tone: "casual",
    strategy: "balanced",
    sampleValueProp: "We help [industry] brands grow revenue with [service], typically seeing [specific result] within [timeframe].",
    brandVoice: "Energetic, results-obsessed, confident. Show your work — lead with results and case studies.",
    sampleObjections: [
      { trigger: "we handle marketing in-house", response: "Most of our clients do too — we work alongside internal teams. What we bring is [specific expertise]. Open to a quick audit?" },
    ],
    apolloFilters: { industries: ["Retail", "Consumer Goods", "Apparel & Fashion"], minEmployees: 20, maxEmployees: 300 },
  },
  {
    id: "recruiting",
    label: "Recruiting / Staffing",
    emoji: "🤝",
    description: "Placing candidates or sourcing talent for companies",
    icp: {
      industries: ["Technology", "Finance", "Healthcare", "Manufacturing"],
      jobTitles: ["VP HR", "Head of Talent", "Director of People", "CHRO", "Talent Acquisition Manager"],
      companySizeLabel: "100–2000 employees",
      companySizeRange: { min: 100, max: 2000 },
      icpDescription: "Companies with active hiring needs in technical or specialized roles, where time-to-hire and candidate quality are critical.",
    },
    tone: "consultative",
    strategy: "nurture",
    sampleValueProp: "We specialize in placing [role type] within [timeframe], with a [X]% retention rate at 1 year.",
    brandVoice: "Warm, credible, relationship-first. You're a talent partner, not a vendor. Speak their language.",
    sampleObjections: [
      { trigger: "we use LinkedIn recruiter", response: "We use it too — the difference is we pre-vet candidates through [process]. You only meet people worth your time." },
    ],
    apolloFilters: { titles: ["talent acquisition", "HR", "people operations"], minEmployees: 100 },
  },
  {
    id: "commercial-real-estate",
    label: "Commercial Real Estate",
    emoji: "🏢",
    description: "Leasing, selling, or managing commercial property",
    icp: {
      industries: ["Real Estate", "Finance", "Professional Services", "Technology"],
      jobTitles: ["CEO", "CFO", "COO", "VP Operations", "Founder", "Office Manager"],
      companySizeLabel: "30–500 employees",
      companySizeRange: { min: 30, max: 500 },
      icpDescription: "Companies in growth mode looking for office, retail, industrial, or warehouse space in [target market].",
    },
    tone: "professional",
    strategy: "nurture",
    sampleValueProp: "We help companies find and lease the right [space type] in [market], typically saving [X]% vs market rate.",
    brandVoice: "Professional, local-market expert. Build trust, not urgency. Relationships drive this business.",
    sampleObjections: [
      { trigger: "happy with current space", response: "Great — what's your lease renewal date? Many of our clients didn't plan to move until we showed them what was available." },
    ],
    apolloFilters: { industries: ["Real Estate"], keywords: ["office", "commercial"] },
  },
  {
    id: "financial-services",
    label: "Financial Services",
    emoji: "📊",
    description: "Accounting, bookkeeping, CFO services, or financial tech",
    icp: {
      industries: ["SaaS", "E-commerce", "Manufacturing", "Professional Services"],
      jobTitles: ["CEO", "CFO", "Founder", "VP Finance", "Controller"],
      companySizeLabel: "10–200 employees",
      companySizeRange: { min: 10, max: 200 },
      icpDescription: "Growing companies that have outgrown basic bookkeeping and need sophisticated financial operations, forecasting, or compliance.",
    },
    tone: "professional",
    strategy: "balanced",
    sampleValueProp: "We provide fractional CFO and accounting services to [size] companies, helping them close their books [X]x faster and raise their next round with clean financials.",
    brandVoice: "Precise, credible, trustworthy. Numbers-forward. Prospects trust experts who sound like experts.",
    sampleObjections: [
      { trigger: "we have a bookkeeper", response: "Bookkeeping is table stakes — we focus on the strategic layer: runway, cash flow forecasting, board reporting. Different function entirely." },
    ],
    apolloFilters: { industries: ["Accounting", "Financial Services"], minEmployees: 10, maxEmployees: 200 },
  },
  {
    id: "healthtech",
    label: "Healthcare / MedTech",
    emoji: "🏥",
    description: "Healthcare software, devices, or services",
    icp: {
      industries: ["Hospital & Health Care", "Medical Devices", "Health Wellness & Fitness"],
      jobTitles: ["CMO", "CIO", "VP Clinical Operations", "Medical Director", "Practice Manager"],
      companySizeLabel: "50–1000 employees",
      companySizeRange: { min: 50, max: 1000 },
      icpDescription: "Healthcare providers, health systems, or medical practices looking to improve patient outcomes, operational efficiency, or revenue cycle management.",
    },
    tone: "consultative",
    strategy: "enterprise",
    sampleValueProp: "We help [provider type] reduce [pain metric] by [X]% through [solution], while staying fully HIPAA-compliant.",
    brandVoice: "Empathetic, evidence-based, compliance-aware. Speak to outcomes and patient impact first.",
    sampleObjections: [
      { trigger: "budget is frozen", response: "Understood — most healthcare projects start with a pilot that's funded from operational savings. Happy to share how [peer org] structured it." },
    ],
    apolloFilters: { industries: ["Hospital & Health Care", "Medical Devices"], minEmployees: 50 },
  },
  {
    id: "manufacturing",
    label: "Manufacturing / Industrial",
    emoji: "🏭",
    description: "Equipment, components, materials, or industrial services",
    icp: {
      industries: ["Manufacturing", "Industrial Automation", "Oil & Energy", "Logistics"],
      jobTitles: ["VP Operations", "Plant Manager", "Director of Procurement", "COO", "VP Supply Chain"],
      companySizeLabel: "100–5000 employees",
      companySizeRange: { min: 100, max: 5000 },
      icpDescription: "Mid-to-large manufacturers with complex supply chains, operational efficiency challenges, or aging equipment looking to modernize.",
    },
    tone: "direct",
    strategy: "nurture",
    sampleValueProp: "We help manufacturers reduce [downtime/cost/waste] by [X]% with [product/service], typically ROI-positive within [timeframe].",
    brandVoice: "No-nonsense, ROI-focused, technically credible. Operations people respect concise, specific numbers.",
    sampleObjections: [
      { trigger: "we have vendors for that", response: "We often work alongside existing vendors — our [differentiator] is what fills the gap. Can I send a 2-page case study?" },
    ],
    apolloFilters: { industries: ["Mechanical or Industrial Engineering", "Oil & Energy", "Logistics & Supply Chain"], minEmployees: 100 },
  },
  {
    id: "ecommerce-wholesale",
    label: "E-commerce / Wholesale",
    emoji: "📦",
    description: "Selling products to retailers, distributors, or online buyers",
    icp: {
      industries: ["Retail", "Wholesale", "E-commerce", "Consumer Goods"],
      jobTitles: ["Head of Procurement", "Buyer", "Category Manager", "VP Merchandising", "Founder"],
      companySizeLabel: "10–500 employees",
      companySizeRange: { min: 10, max: 500 },
      icpDescription: "Retailers and distributors looking for new product lines, better pricing, or more reliable suppliers in [product category].",
    },
    tone: "direct",
    strategy: "aggressive",
    sampleValueProp: "We supply [product category] to retailers with [MOQ], [lead time], and margins of [X]% — stocked and ready to ship.",
    brandVoice: "Efficient, deal-focused, responsive. Buyers are busy — get to the point fast.",
    sampleObjections: [
      { trigger: "already have a supplier", response: "Makes sense. Many of our retailers carry us alongside their current supplier as a backup or to fill gaps. Happy to send a sample?" },
    ],
    apolloFilters: { industries: ["Retail", "Wholesale"], titles: ["buyer", "procurement", "merchandising"] },
  },
  {
    id: "consulting",
    label: "Consulting / Advisory",
    emoji: "🧠",
    description: "Strategy, management, or specialized advisory services",
    icp: {
      industries: ["Financial Services", "Technology", "Healthcare", "Government"],
      jobTitles: ["CEO", "COO", "VP Strategy", "Board Member", "Managing Director"],
      companySizeLabel: "200–10,000 employees",
      companySizeRange: { min: 200, max: 10000 },
      icpDescription: "Mid-market and enterprise organizations facing a strategic inflection point, operational challenge, or transformation initiative.",
    },
    tone: "consultative",
    strategy: "enterprise",
    sampleValueProp: "We help [org type] navigate [challenge] and achieve [outcome], typically delivering [measurable result] within [timeframe].",
    brandVoice: "Authoritative, insight-led, peer-to-peer at the executive level. Provocative with a point of view.",
    sampleObjections: [
      { trigger: "using a big firm already", response: "We often work alongside the big firms — they do strategy, we do execution. Different scope entirely. What's the specific problem on the table?" },
    ],
    apolloFilters: { seniority: ["c_suite", "vp", "director"], minEmployees: 200 },
  },
  {
    id: "construction",
    label: "Construction / Facilities",
    emoji: "🏗️",
    description: "Commercial construction, fit-outs, or facilities management",
    icp: {
      industries: ["Construction", "Real Estate", "Hospitality", "Retail"],
      jobTitles: ["Project Manager", "VP Real Estate", "Facilities Manager", "COO", "Property Manager"],
      companySizeLabel: "20–1000 employees",
      companySizeRange: { min: 20, max: 1000 },
      icpDescription: "Commercial real estate owners, retailers, or operators with ongoing build-out, renovation, or facilities maintenance needs.",
    },
    tone: "direct",
    strategy: "balanced",
    sampleValueProp: "We deliver [scope] on time and on budget for [client type], with a track record of [metric] in [market].",
    brandVoice: "Dependable, no-BS, locally credible. Show your portfolio. These clients buy on trust.",
    sampleObjections: [
      { trigger: "happy with our current contractor", response: "Fair enough — we're happy to be a backup or handle overflow. Do you ever have capacity issues during peak periods?" },
    ],
    apolloFilters: { industries: ["Construction", "Facilities Services"], minEmployees: 20 },
  },
  {
    id: "legal",
    label: "Legal / Compliance",
    emoji: "⚖️",
    description: "Legal services, compliance software, or regulatory advisory",
    icp: {
      industries: ["Financial Services", "Healthcare", "Technology", "Manufacturing"],
      jobTitles: ["General Counsel", "Chief Compliance Officer", "VP Legal", "CLO", "Risk Manager"],
      companySizeLabel: "100–5000 employees",
      companySizeRange: { min: 100, max: 5000 },
      icpDescription: "Companies in regulated industries facing compliance complexity, legal risk, or the need to operationalize legal workflows at scale.",
    },
    tone: "professional",
    strategy: "nurture",
    sampleValueProp: "We help [company type] reduce [compliance/legal risk] by [mechanism], saving [X] hours per month in [function].",
    brandVoice: "Precise, risk-aware, credible. These buyers are detail-oriented — lead with specifics and credentials.",
    sampleObjections: [
      { trigger: "we use outside counsel for that", response: "Outside counsel is great for advice — we handle the operational layer so your team and outside counsel spend less time on [specific task]." },
    ],
    apolloFilters: { titles: ["compliance", "legal", "counsel", "risk"], minEmployees: 100 },
  },
  {
    id: "hardware",
    label: "Tech Hardware",
    emoji: "🔧",
    description: "Physical tech products, IoT devices, or infrastructure",
    icp: {
      industries: ["Manufacturing", "Technology", "Logistics", "Energy"],
      jobTitles: ["CTO", "VP Engineering", "Director of IT", "Head of Infrastructure", "VP Operations"],
      companySizeLabel: "50–2000 employees",
      companySizeRange: { min: 50, max: 2000 },
      icpDescription: "Companies with physical operations that need hardware solutions for connectivity, automation, monitoring, or infrastructure modernization.",
    },
    tone: "direct",
    strategy: "balanced",
    sampleValueProp: "Our [device/system] gives [company type] real-time visibility into [operation], reducing [cost/downtime] by [X]%.",
    brandVoice: "Technical but accessible. Lead with specs and outcomes. Buyers want to know it works, not just that it sounds good.",
    sampleObjections: [
      { trigger: "integration concerns", response: "We integrate with [list of major platforms] out of the box. For others, our API team handles it. We can start with a pilot to derisk." },
    ],
    apolloFilters: { industries: ["Computer Hardware", "Telecommunications", "Semiconductors"], minEmployees: 50 },
  },
];

export function getPresetById(id: string): IndustryPreset | undefined {
  return INDUSTRY_PRESETS.find((p) => p.id === id);
}
