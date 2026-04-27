import { db } from "@/lib/db/client";
import { suppressionList, contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface ComplianceCheck {
  email: string;
  orgId: string;
}

// Must pass before ANY outbound message is sent.
// Returns false if the email is suppressed or contact opted out.
export async function checkCompliance({
  email,
  orgId,
}: ComplianceCheck): Promise<boolean> {
  if (!email) return false;

  // Check global suppression list (unsubscribes, bounces, complaints)
  const [suppressed] = await db
    .select()
    .from(suppressionList)
    .where(and(eq(suppressionList.email, email), eq(suppressionList.orgId, orgId)))
    .limit(1);

  if (suppressed) return false;

  // Check contact-level opt-out flag
  const [contact] = await db
    .select({ unsubscribed: contacts.unsubscribed, dnc: contacts.dnc })
    .from(contacts)
    .where(and(eq(contacts.email, email), eq(contacts.orgId, orgId)))
    .limit(1);

  if (contact?.unsubscribed || contact?.dnc) return false;

  return true;
}
