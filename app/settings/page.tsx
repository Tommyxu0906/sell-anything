import { Header } from "@/components/dashboard/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutonomySettings } from "./autonomy-settings";
import { PlaybookSettings } from "./playbook-settings";
import { requireOrg } from "@/lib/auth/current-org";
import { db } from "@/lib/db/client";
import { playbooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage() {
  let org = null;
  let playbook = null;

  try {
    org = await requireOrg();
    const [pb] = await db.select().from(playbooks).where(eq(playbooks.orgId, org.id)).limit(1);
    playbook = pb;
  } catch {
    // DB not connected
  }

  return (
    <div>
      <Header title="Settings" />
      <div className="p-6">
        <Tabs defaultValue="autonomy">
          <TabsList>
            <TabsTrigger value="autonomy">AI Autonomy</TabsTrigger>
            <TabsTrigger value="playbook">Playbook</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="autonomy" className="mt-6">
            <AutonomySettings
              orgId={org?.id}
              initialSettings={(org?.autonomySettings as Record<string, string>) ?? {}}
            />
          </TabsContent>

          <TabsContent value="playbook" className="mt-6">
            <PlaybookSettings playbook={playbook} />
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <div className="rounded-xl border p-6">
              <h2 className="text-lg font-semibold">Billing</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage your subscription and billing details.
              </p>
              <a
                href="#"
                className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open billing portal
              </a>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
