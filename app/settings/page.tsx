import { Header } from "@/components/dashboard/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutonomySettings } from "./autonomy-settings";
import { PlaybookSettings } from "./playbook-settings";
import { requireOrg } from "@/lib/auth/current-org";
import { db } from "@/lib/db/client";
import { playbooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Home, Shield, Sliders } from "lucide-react";

export default async function SettingsPage() {
  let org = null;
  let rePlaybook = null;
  let insPlaybook = null;

  try {
    org = await requireOrg();
    const allPlaybooks = await db.select().from(playbooks).where(eq(playbooks.orgId, org.id));
    rePlaybook = allPlaybooks.find((p) => p.industry === "commercial-real-estate" || p.isDefault) ?? allPlaybooks[0] ?? null;
    insPlaybook = allPlaybooks.find((p) => p.industry === "life-insurance") ?? null;
  } catch {
    // DB not connected
  }

  return (
    <div>
      <Header title="Settings" />
      <div className="p-6">
        <Tabs defaultValue="real-estate">
          <TabsList>
            <TabsTrigger value="real-estate" className="gap-1.5">
              <Home className="h-3.5 w-3.5 text-orange-500" /> Real Estate
            </TabsTrigger>
            <TabsTrigger value="insurance" className="gap-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-500" /> Life Insurance
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5">
              <Sliders className="h-3.5 w-3.5" /> AI Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="real-estate" className="mt-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Prophet Homes — Real Estate Playbook</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Controls how the AI writes all real estate outreach and scores investor leads.</p>
            </div>
            <PlaybookSettings playbook={rePlaybook} label="Real Estate" />
          </TabsContent>

          <TabsContent value="insurance" className="mt-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold">National Life Group — Insurance Playbook</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Controls how the AI writes insurance outreach. All drafts are compliant — you review before sending.</p>
            </div>
            <PlaybookSettings playbook={insPlaybook} label="Life Insurance" />
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold">AI Autonomy Preferences</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Control how much the AI does automatically vs. waiting for your review.</p>
            </div>
            <AutonomySettings
              orgId={org?.id}
              initialSettings={(org?.autonomySettings as Record<string, string>) ?? {}}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
