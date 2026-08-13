import { Header } from "@/components/dashboard/header";
import { AutonomySettings } from "./autonomy-settings";
import { VoiceSettings } from "./voice-settings";
import { requireOrg } from "@/lib/auth/current-org";

export default async function SettingsPage() {
  let org = null;
  try {
    org = await requireOrg();
  } catch {
    // DB not connected
  }

  return (
    <div>
      <Header title="Settings" />
      <div className="p-6 max-w-3xl space-y-10">
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold">Voice &amp; Humanization</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Teach the AI to write and speak like you — applied to every email, reply, and call script.
            </p>
          </div>
          <VoiceSettings orgId={org?.id} initialVoice={org?.voiceProfile} initialSignature={org?.signatureName} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold">AI Autonomy</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Control how much the AI does automatically vs. waiting for your review.
            </p>
          </div>
          <AutonomySettings
            orgId={org?.id}
            initialSettings={(org?.autonomySettings as Record<string, string>) ?? {}}
          />
        </section>
      </div>
    </div>
  );
}
