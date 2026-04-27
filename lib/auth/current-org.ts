import { db } from "@/lib/db/client";
import { orgMembers, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "./supabase-server";

export async function getCurrentOrg() {
  const user = await getUser();
  if (!user) return null;

  const membership = await db
    .select({ org: organizations })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, user.id))
    .limit(1);

  return membership[0]?.org ?? null;
}

export async function requireOrg() {
  const org = await getCurrentOrg();
  if (!org) throw new Error("No organization found for user");
  return org;
}

export async function requireOrgMember(orgId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthenticated");

  const [member] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, user.id)))
    .limit(1);

  if (!member) throw new Error("Not a member of this organization");
  return { user, member };
}
