"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAutonomySettings } from "@/lib/actions/settings";

const MODULES = [
  { key: "prospect", label: "Prospecting", description: "Finding and enriching new leads" },
  { key: "draft", label: "Email Drafting", description: "Writing personalized outreach" },
  { key: "send", label: "Sending Emails", description: "Actually delivering emails" },
  { key: "reply", label: "Reply Handling", description: "Drafting responses to inbound replies" },
  { key: "schedule", label: "Meeting Scheduling", description: "Booking calendar meetings" },
  { key: "sms", label: "SMS Outreach", description: "Text message follow-ups" },
];

const LEVEL_LABELS: Record<number, { label: string; description: string }> = {
  0: { label: "Off", description: "AI suggests only — no actions taken" },
  1: { label: "Review all", description: "AI drafts, you approve every single action" },
  2: { label: "Review exceptions", description: "AI runs routine, escalates edge cases" },
  3: { label: "Daily digest", description: "AI runs autonomously, you get a daily summary" },
  4: { label: "Weekly review", description: "AI runs fully, you review weekly" },
  5: { label: "Full autopilot", description: "AI handles everything end-to-end" },
};

const PRESETS = {
  conservative: { prospect: 3, draft: 1, send: 1, reply: 1, schedule: 1, sms: 0 },
  balanced: { prospect: 4, draft: 2, send: 2, reply: 1, schedule: 2, sms: 0 },
  autopilot: { prospect: 5, draft: 4, send: 4, reply: 3, schedule: 4, sms: 1 },
};

function levelToNumber(l: string): number {
  return parseInt(l.replace("L", "")) || 1;
}

function numberToLevel(n: number): string {
  return `L${n}`;
}

interface Props {
  orgId?: string;
  initialSettings: Record<string, string>;
}

export function AutonomySettings({ orgId, initialSettings }: Props) {
  const [settings, setSettings] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    MODULES.forEach(({ key }) => {
      out[key] = levelToNumber(initialSettings[key] ?? "L1");
    });
    return out;
  });

  function applyPreset(preset: keyof typeof PRESETS) {
    setSettings(PRESETS[preset]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Autonomy Presets</CardTitle>
          <CardDescription>Quick-start configurations for different risk tolerances.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          {(["conservative", "balanced", "autopilot"] as const).map((preset) => (
            <Button key={preset} variant="outline" className="capitalize" onClick={() => applyPreset(preset)}>
              {preset}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {MODULES.map(({ key, label, description }) => {
          const level = settings[key] ?? 1;
          const levelInfo = LEVEL_LABELS[level];
          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">L{level} — {levelInfo.label}</p>
                    <p className="text-xs text-muted-foreground">{levelInfo.description}</p>
                  </div>
                </div>
                <Slider
                  min={0}
                  max={5}
                  step={1}
                  value={[level]}
                  onValueChange={(val: number | readonly number[]) => {
                    const v = Array.isArray(val) ? (val as number[])[0] : (val as number);
                    setSettings((prev) => ({ ...prev, [key]: v ?? prev[key] }));
                  }}
                  className="w-full"
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Off</span>
                  <span>Full autopilot</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <form
        action={async () => {
          if (!orgId) return;
          const formatted: Record<string, string> = {};
          Object.entries(settings).forEach(([k, v]) => { formatted[k] = numberToLevel(v); });
          await saveAutonomySettings(orgId, formatted);
        }}
      >
        <Button type="submit" className="w-full">Save autonomy settings</Button>
      </form>
    </div>
  );
}
