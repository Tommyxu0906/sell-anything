import { Suspense } from "react";
import { Sidebar, type SidebarOffering } from "@/components/dashboard/sidebar";
import { requireOrg } from "@/lib/auth/current-org";
import { db } from "@/lib/db/client";
import { offerings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

async function loadShell(): Promise<{ orgName?: string; offerings: SidebarOffering[] }> {
  try {
    const org = await requireOrg();
    const rows = await db
      .select({ id: offerings.id, name: offerings.name, status: offerings.status })
      .from(offerings)
      .where(eq(offerings.orgId, org.id))
      .orderBy(desc(offerings.createdAt));
    return { orgName: org.name, offerings: rows };
  } catch {
    return { offerings: [] };
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { orgName, offerings: offeringList } = await loadShell();

  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<div className="w-56 border-r bg-background" />}>
        <Sidebar orgName={orgName} offerings={offeringList} />
      </Suspense>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
