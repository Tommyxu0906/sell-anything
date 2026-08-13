/**
 * Seeds a demo org with three deliberately different offerings so the app shows
 * distinct channel strategies out of the box (great for a portfolio walkthrough):
 *   - a B2B SaaS       → leans SEO / outbound
 *   - a local service  → leans local presence
 *   - a DTC product    → leans social
 *
 * Run: pnpm seed:demo   (requires DATABASE_URL)
 * Then trigger research from the UI (or via the research/offering event).
 */
import { db } from "@/lib/db/client";
import { organizations, orgMembers, offerings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEMO_SLUG = "demo-sellanything";

const DEMO_OFFERINGS = [
  {
    name: "Acme Project Hub",
    description: "A project-management SaaS for small marketing agencies. $49/user/mo, self-serve with a sales-assisted tier.",
    url: "https://example.com/acme",
    category: "b2b-saas",
    audienceType: "b2b" as const,
    priceModel: "subscription",
    priceBand: "mid" as const,
    avgDealValue: 3000,
    salesCycle: "medium",
    geoScope: "global",
  },
  {
    name: "BrightSmile Dental",
    description: "A family dental practice offering cleanings, cosmetic, and emergency care in the Boston metro area.",
    url: "https://example.com/brightsmile",
    category: "local-service",
    audienceType: "local" as const,
    priceModel: "one_time",
    priceBand: "mid" as const,
    avgDealValue: 400,
    salesCycle: "short",
    geoScope: "local",
  },
  {
    name: "Ember & Oak Candles",
    description: "Hand-poured soy candles sold direct-to-consumer online. $28 each, lifestyle brand with a strong Instagram aesthetic.",
    url: "https://example.com/emberoak",
    category: "dtc",
    audienceType: "b2c" as const,
    priceModel: "one_time",
    priceBand: "low" as const,
    avgDealValue: 40,
    salesCycle: "impulse",
    geoScope: "national",
  },
];

async function main() {
  let [org] = await db.select().from(organizations).where(eq(organizations.slug, DEMO_SLUG)).limit(1);
  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({ name: "Demo Co", slug: DEMO_SLUG })
      .returning();
    console.log(`Created demo org ${org.id}`);
  } else {
    console.log(`Reusing demo org ${org.id}`);
  }

  // Attach a placeholder member so requireOrg() resolves for a signed-in demo user.
  const demoUserId = process.env.DEMO_USER_ID;
  if (demoUserId) {
    const existing = await db.select().from(orgMembers).where(eq(orgMembers.orgId, org.id));
    if (!existing.some((m) => m.userId === demoUserId)) {
      await db.insert(orgMembers).values({ orgId: org.id, userId: demoUserId, role: "owner" });
      console.log(`Linked demo user ${demoUserId} as owner`);
    }
  } else {
    console.log("Set DEMO_USER_ID to link your Supabase user to the demo org.");
  }

  for (const o of DEMO_OFFERINGS) {
    const [row] = await db
      .insert(offerings)
      .values({ orgId: org.id, status: "draft", ...o })
      .returning();
    console.log(`  + offering: ${row.name} (${row.id})`);
  }

  console.log("\nDone. Open the app, then run research on each offering to see distinct strategies.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
