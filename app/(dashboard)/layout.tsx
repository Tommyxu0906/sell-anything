import { Sidebar } from "@/components/dashboard/sidebar";
import { getUser } from "@/lib/auth/supabase-server";
import { getCurrentOrg } from "@/lib/auth/current-org";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let orgName = "My Org";
  let userEmail = "";

  try {
    const [user, org] = await Promise.all([getUser(), getCurrentOrg()]);
    userEmail = user?.email ?? "";
    orgName = org?.name ?? "My Org";
  } catch {
    // DB not connected yet — still render layout
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar orgName={orgName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
