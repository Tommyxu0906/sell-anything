import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { db } from "@/lib/db/client";
import { contacts, organizations, playbooks, messages, orgLearnings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateCallScript } from "@/lib/ai/generate-call-script";
import { requireOrg } from "@/lib/auth/current-org";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId, callPurpose } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const org = await requireOrg();

  const [[contact], [playbook], priorMessages, learnings, [orgRow]] = await Promise.all([
    db.select().from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.orgId, org.id))).limit(1),
    db.select().from(playbooks)
      .where(and(eq(playbooks.orgId, org.id), eq(playbooks.isDefault, true))).limit(1),
    db.select().from(messages)
      .where(and(eq(messages.contactId, contactId), eq(messages.orgId, org.id)))
      .orderBy(desc(messages.createdAt)).limit(8),
    db.select().from(orgLearnings).where(eq(orgLearnings.orgId, org.id)).limit(20),
    db.select().from(organizations).where(eq(organizations.id, org.id)).limit(1),
  ]);

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const script = await generateCallScript({
    contact,
    org: orgRow,
    playbook: playbook ?? null,
    learnings,
    priorMessages,
    callPurpose: callPurpose ?? "intro",
    businessLine: (contact.businessLine ?? "real_estate") as "real_estate" | "life_insurance",
  });

  return NextResponse.json(script);
}
