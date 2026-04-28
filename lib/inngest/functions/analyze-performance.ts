import { inngest } from "../client";
import { db } from "@/lib/db/client";
import { organizations, messages, draftEdits, orgLearnings, playbooks } from "@/lib/db/schema";
import { eq, and, gte, count, avg, isNotNull } from "drizzle-orm";
import { analyzeOrgPerformance } from "@/lib/ai/analyze-performance";

export const analyzePerformance = inngest.createFunction(
  {
    id: "analyze-performance",
    name: "Weekly performance analysis + learning update",
    triggers: [
      { event: "analytics/analyze-org" },
      { cron: "0 6 * * 1" }, // also run every Monday 6am
    ],
    concurrency: { limit: 3 },
  },
  async ({ event, step }) => {
    const data = event.data as { orgId?: string } | undefined;
    const orgIds: string[] = data?.orgId
      ? [data.orgId]
      : await step.run("get-all-orgs", async () => {
          const orgs = await db.select({ id: organizations.id }).from(organizations);
          return orgs.map((o) => o.id);
        });

    for (const orgId of orgIds) {
      await step.run(`analyze-org-${orgId}`, async () => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Performance counts
        const [totalSentRow] = await db
          .select({ n: count() })
          .from(messages)
          .where(and(
            eq(messages.orgId, orgId),
            eq(messages.reviewStatus, "sent"),
            gte(messages.sentAt, thirtyDaysAgo)
          ));

        const [totalRepliedRow] = await db
          .select({ n: count() })
          .from(messages)
          .where(and(
            eq(messages.orgId, orgId),
            isNotNull(messages.repliedAt),
            gte(messages.createdAt, thirtyDaysAgo)
          ));

        const [editedCountRow] = await db
          .select({ n: count() })
          .from(messages)
          .where(and(
            eq(messages.orgId, orgId),
            eq(messages.wasEdited, true),
            gte(messages.createdAt, thirtyDaysAgo)
          ));

        // Edit patterns for style learning
        const edits = await db
          .select({
            aiSubject: draftEdits.aiSubject,
            aiBody: draftEdits.aiBody,
            userSubject: draftEdits.userSubject,
            userBody: draftEdits.userBody,
          })
          .from(draftEdits)
          .where(and(
            eq(draftEdits.orgId, orgId),
            gte(draftEdits.createdAt, thirtyDaysAgo)
          ))
          .limit(20);

        // Word count of emails that got replies vs all
        const repliedMessages = await db
          .select({ body: messages.body })
          .from(messages)
          .where(and(
            eq(messages.orgId, orgId),
            isNotNull(messages.repliedAt),
            gte(messages.createdAt, thirtyDaysAgo)
          ))
          .limit(50);

        const allMessages = await db
          .select({ body: messages.body })
          .from(messages)
          .where(and(
            eq(messages.orgId, orgId),
            eq(messages.reviewStatus, "sent"),
            gte(messages.sentAt, thirtyDaysAgo)
          ))
          .limit(100);

        const wordCount = (text: string) => text.split(/\s+/).length;
        const avgWordCount = (msgs: { body: string }[]) =>
          msgs.length === 0 ? 0 : msgs.reduce((sum, m) => sum + wordCount(m.body), 0) / msgs.length;

        // Fetch existing learning context
        const [defaultPlaybook] = await db
          .select({ learningContext: playbooks.learningContext, name: playbooks.name })
          .from(playbooks)
          .where(and(eq(playbooks.orgId, orgId), eq(playbooks.isDefault, true)))
          .limit(1);

        const [org] = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);

        if (!org) return;

        const analysis = await analyzeOrgPerformance(org.name, {
          totalSent: totalSentRow?.n ?? 0,
          totalReplied: totalRepliedRow?.n ?? 0,
          editedCount: editedCountRow?.n ?? 0,
          editPatterns: edits,
          replyRateByStep: {}, // TODO: join with sequence steps for per-step analysis
          avgWordCountReplied: Math.round(avgWordCount(repliedMessages)),
          avgWordCountAll: Math.round(avgWordCount(allMessages)),
        }, defaultPlaybook?.learningContext);

        // Upsert style preference learnings
        for (const pref of analysis.stylePreferences) {
          await db
            .delete(orgLearnings)
            .where(and(
              eq(orgLearnings.orgId, orgId),
              eq(orgLearnings.category, "style"),
              eq(orgLearnings.key, pref.key)
            ));

          await db.insert(orgLearnings).values({
            orgId,
            category: "style",
            key: pref.key,
            value: { rule: pref.rule },
            confidence: String(pref.confidence),
            evidenceCount: pref.evidenceCount,
          });
        }

        // Upsert performance insights
        for (const insight of analysis.performanceInsights) {
          await db
            .delete(orgLearnings)
            .where(and(
              eq(orgLearnings.orgId, orgId),
              eq(orgLearnings.category, "performance"),
              eq(orgLearnings.key, insight.key)
            ));

          await db.insert(orgLearnings).values({
            orgId,
            category: "performance",
            key: insight.key,
            value: { insight: insight.insight, value: insight.value },
            confidence: String(insight.confidence),
          });
        }

        // Update the playbook's learning context
        if (defaultPlaybook && analysis.updatedLearningContext) {
          await db
            .update(playbooks)
            .set({ learningContext: analysis.updatedLearningContext, updatedAt: new Date() })
            .where(and(eq(playbooks.orgId, orgId), eq(playbooks.isDefault, true)));
        }
      });
    }

    return { analyzed: orgIds.length };
  }
);
