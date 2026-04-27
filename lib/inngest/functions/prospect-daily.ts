import { inngest } from "../client";
import { db } from "@/lib/db/client";
import { contacts, companies, playbooks, sequences, contactSequences, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { searchPeople } from "@/lib/integrations/apollo";
import { findEmail } from "@/lib/integrations/hunter";
import { scoreLead } from "@/lib/ai/score-lead";
import { checkCompliance } from "@/lib/compliance/dnc";

export const prospectDaily = inngest.createFunction(
  {
    id: "prospect-daily",
    name: "Daily prospect pull",
    triggers: [{ event: "prospect/daily-pull" }],
    concurrency: { limit: 5 },
  },
  async ({ event, step }) => {
    const { orgId } = event.data;

    // Fetch org + playbook for ICP
    const [org] = await step.run("fetch-org", async () => {
      return db.select({ org: organizations, pb: playbooks })
        .from(organizations)
        .leftJoin(playbooks, and(eq(playbooks.orgId, organizations.id), eq(playbooks.isDefault, true)))
        .where(eq(organizations.id, orgId))
        .limit(1);
    });

    if (!org?.pb) return { skipped: "no playbook configured" };

    const playbook = org.pb;
    if (!playbook.icpDescription) return { skipped: "no ICP description" };

    // Pull leads from Apollo
    const apolloResults = await step.run("apollo-search", async () => {
      return searchPeople({
        jobTitles: playbook.targetJobTitles ?? ["CEO", "Founder", "VP Sales"],
        industries: playbook.targetIndustries ?? [],
        perPage: 25,
      });
    });

    let inserted = 0;
    let skipped = 0;

    for (const person of apolloResults) {
      await step.run(`process-lead-${person.id}`, async () => {
        // Try to get email
        let email = person.email;
        if (!email && person.first_name && person.last_name && person.organization?.website_url) {
          const domain = new URL(person.organization.website_url).hostname.replace("www.", "");
          email = await findEmail(person.first_name, person.last_name, domain);
        }

        if (!email) { skipped++; return; }

        // Compliance check — skip if already suppressed
        const ok = await checkCompliance({ email, orgId });
        if (!ok) { skipped++; return; }

        // Check if we already have this contact
        const [existing] = await db.select({ id: contacts.id })
          .from(contacts)
          .where(and(eq(contacts.email, email), eq(contacts.orgId, orgId)))
          .limit(1);

        if (existing) { skipped++; return; }

        // Score against ICP
        const { score, reasoning } = await scoreLead(
          {
            firstName: person.first_name,
            lastName: person.last_name,
            jobTitle: person.title,
            industry: person.organization?.industry,
            employeeCount: person.organization?.estimated_num_employees,
            location: person.city && person.state ? `${person.city}, ${person.state}` : person.country,
            linkedinUrl: person.linkedin_url,
          },
          playbook.icpDescription ?? ""
        );

        // Only add contacts scoring >= 50
        if (score < 50) { skipped++; return; }

        // Upsert company
        let companyId: string | null = null;
        if (person.organization) {
          const [company] = await db.insert(companies).values({
            orgId,
            name: person.organization.name,
            domain: person.organization.website_url
              ? new URL(person.organization.website_url).hostname.replace("www.", "")
              : null,
            industry: person.organization.industry,
            employeeCount: person.organization.estimated_num_employees,
            websiteUrl: person.organization.website_url,
            linkedinUrl: person.organization.linkedin_url,
            apolloId: person.organization.id,
          }).onConflictDoNothing().returning();
          companyId = company?.id ?? null;
        }

        // Insert contact
        await db.insert(contacts).values({
          orgId,
          companyId,
          firstName: person.first_name,
          lastName: person.last_name,
          email,
          jobTitle: person.title,
          linkedinUrl: person.linkedin_url,
          location: person.city && person.state ? `${person.city}, ${person.state}` : person.country,
          stage: "new",
          icpScore: score,
          apolloId: person.id,
          enrichedAt: new Date(),
        });

        inserted++;

        // Auto-enroll high-scoring leads in default sequence if autonomy allows
        const autonomy = (org.org?.autonomySettings as Record<string, string>)?.send ?? "L1";
        const sendLevel = parseInt(autonomy.replace("L", ""));

        if (sendLevel >= 2) {
          const [defaultSeq] = await db.select({ id: sequences.id, playbookId: sequences.playbookId })
            .from(sequences)
            .where(and(eq(sequences.orgId, orgId), eq(sequences.isActive, true)))
            .limit(1);

          if (defaultSeq) {
            const [newContact] = await db.select({ id: contacts.id })
              .from(contacts)
              .where(and(eq(contacts.email, email), eq(contacts.orgId, orgId)))
              .limit(1);

            if (newContact) {
              const [cs] = await db.insert(contactSequences).values({
                orgId,
                contactId: newContact.id,
                sequenceId: defaultSeq.id,
                currentStep: 1,
                status: "active",
                nextStepAt: new Date(),
              }).returning();

              await inngest.send({
                name: "outreach/send",
                data: { contactSequenceId: cs.id, orgId, stepNumber: 1 },
              });
            }
          }
        }
      });
    }

    return { inserted, skipped, total: apolloResults.length };
  }
);
