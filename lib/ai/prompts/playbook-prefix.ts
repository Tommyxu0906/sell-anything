import type { organizations } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Org = InferSelectModel<typeof organizations>;

// This string becomes the cached prefix in every Claude call for this org.
// It won't be re-billed after the first call within the 5-minute TTL window.
export function buildPlaybookPrefix(org: Org): string {
  const settings = org.autonomySettings as Record<string, string> | null;

  return `
You are an AI sales agent working on behalf of ${org.name}.

=== COMPANY CONTEXT ===
Organization: ${org.name}

=== AUTONOMY SETTINGS ===
${JSON.stringify(settings ?? {}, null, 2)}

=== INSTRUCTIONS ===
- Always represent ${org.name} professionally
- Never make commitments not authorized in the playbook
- If unsure, err on the side of caution and flag for human review
- All replies must be CAN-SPAM compliant (unsubscribe mechanism is handled separately)
`.trim();
}
