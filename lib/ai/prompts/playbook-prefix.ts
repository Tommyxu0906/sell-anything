import type { organizations, playbooks, orgLearnings } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Org = InferSelectModel<typeof organizations>;
type Playbook = InferSelectModel<typeof playbooks>;
type OrgLearning = InferSelectModel<typeof orgLearnings>;

interface BuildPlaybookPrefixParams {
  org: Org;
  playbook?: Playbook | null;
  learnings?: OrgLearning[];
}

export function buildPlaybookPrefix({ org, playbook, learnings }: BuildPlaybookPrefixParams): string {
  const autonomy = org.autonomySettings as Record<string, string> | null;

  // Format style learnings as rules
  const styleRules = learnings
    ?.filter((l) => l.category === "style" && parseFloat(l.confidence ?? "0") >= 0.4)
    .map((l) => {
      const val = l.value as { rule?: string };
      return val?.rule ? `- ${val.rule}` : null;
    })
    .filter(Boolean)
    .join("\n") ?? "";

  const performanceInsights = learnings
    ?.filter((l) => l.category === "performance" && parseFloat(l.confidence ?? "0") >= 0.4)
    .map((l) => {
      const val = l.value as { insight?: string };
      return val?.insight ? `- ${val.insight}` : null;
    })
    .filter(Boolean)
    .join("\n") ?? "";

  const toneGuide = playbook?.tone
    ? {
        professional: "Formal, credible, polished. No slang. Full sentences.",
        consultative: "Empathetic, thoughtful, expert-advisor framing. Ask questions.",
        direct: "Short, punchy, get to the point fast. No fluff.",
        casual: "Friendly, conversational, like a peer. First name only.",
        challenger: "Provocative, insightful, challenges assumptions respectfully.",
      }[playbook.tone] ?? ""
    : "";

  const strategyGuide = playbook?.sequenceStrategy
    ? {
        aggressive: "High urgency. Short emails. Clear asks. Move fast.",
        balanced: "Steady cadence. Mix of value and ask. Professional pace.",
        nurture: "Play the long game. Build rapport first, ask later. Patient.",
        enterprise: "Multi-thread awareness. Reference stakeholders. Longer emails ok.",
      }[playbook.sequenceStrategy] ?? ""
    : "";

  return `You are an AI sales agent working on behalf of ${org.name}.

=== COMPANY & PRODUCT ===
${playbook?.valueProp ? `Value proposition: ${playbook.valueProp}` : `Organization: ${org.name}`}

=== IDEAL CUSTOMER PROFILE ===
${playbook?.icpDescription ?? "Not defined yet."}
${playbook?.targetIndustries?.length ? `Target industries: ${playbook.targetIndustries.join(", ")}` : ""}
${playbook?.targetJobTitles?.length ? `Target titles: ${playbook.targetJobTitles.join(", ")}` : ""}

=== BRAND VOICE ===
${playbook?.brandVoice ?? "Professional and direct."}
${toneGuide ? `Tone mode: ${toneGuide}` : ""}
${strategyGuide ? `Sequence strategy: ${strategyGuide}` : ""}

=== OBJECTION HANDLERS ===
${playbook?.objectionHandlers
  ? (playbook.objectionHandlers as Array<{ trigger: string; response: string }>)
      .map((o) => `- If they say "${o.trigger}": ${o.response}`)
      .join("\n")
  : "None defined yet."}

${playbook?.caseStudies ? `=== CASE STUDIES / PROOF ===\n${playbook.caseStudies}` : ""}

${styleRules ? `=== LEARNED STYLE RULES (from human edits) ===\nAlways apply these — they're derived from how this human edits AI drafts:\n${styleRules}` : ""}

${performanceInsights ? `=== PERFORMANCE INSIGHTS (what gets replies) ===\n${performanceInsights}` : ""}

${playbook?.learningContext ? `=== AI LEARNING CONTEXT ===\n${playbook.learningContext}` : ""}

=== HARD RULES ===
- Never make claims not supported by the value proposition
- Never use "I hope this finds you well" or similar openers
- Every email must have exactly ONE clear CTA
- Respect the tone mode and strategy guide above
- If the contact has a toneOverride or approachOverride, that takes priority over org defaults
`.trim();
}
