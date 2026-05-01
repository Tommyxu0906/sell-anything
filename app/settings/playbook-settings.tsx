"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { savePlaybook } from "@/lib/actions/settings";
import type { playbooks } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Playbook = InferSelectModel<typeof playbooks>;

export function PlaybookSettings({ playbook, label }: { playbook: Playbook | null; label?: string }) {
  const [data, setData] = useState({
    valueProp: playbook?.valueProp ?? "",
    brandVoice: playbook?.brandVoice ?? "",
    icpDescription: playbook?.icpDescription ?? "",
    caseStudies: playbook?.caseStudies ?? "",
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Value Proposition</CardTitle>
          <CardDescription>What you sell and why customers choose you. Used in every email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            placeholder="We help B2B SaaS companies automate outbound sales with AI..."
            value={data.valueProp}
            onChange={(e) => setData({ ...data, valueProp: e.target.value })}
            className="resize-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Voice</CardTitle>
          <CardDescription>How should the AI sound when writing emails?</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Professional and direct, like a trusted advisor. No fluff."
            value={data.brandVoice}
            onChange={(e) => setData({ ...data, brandVoice: e.target.value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ICP Description</CardTitle>
          <CardDescription>Who is your ideal customer? Used to score and qualify leads.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            placeholder="B2B SaaS companies with 10-200 employees, VP Sales or Founders, in North America..."
            value={data.icpDescription}
            onChange={(e) => setData({ ...data, icpDescription: e.target.value })}
            className="resize-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case Studies / Social Proof</CardTitle>
          <CardDescription>Brief examples the AI can reference in emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Acme Corp grew outbound by 3x in 90 days. TechStartup closed 5 enterprise deals in their first month..."
            value={data.caseStudies}
            onChange={(e) => setData({ ...data, caseStudies: e.target.value })}
            className="resize-none"
          />
        </CardContent>
      </Card>

      <form
        action={async () => {
          if (!playbook?.id) return;
          await savePlaybook(playbook.id, data);
        }}
      >
        <Button type="submit" className="w-full">Save playbook</Button>
      </form>
    </div>
  );
}
