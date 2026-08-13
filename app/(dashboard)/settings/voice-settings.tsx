"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveVoiceProfile } from "@/lib/actions/settings";
import { Sparkles, Check } from "lucide-react";

const VOICE_EXAMPLE = `我发消息很直接，不喜欢绕圈子。开头一般就是名字加一句话说清楚为什么找他。喜欢用具体的房子、街区、数字，不说空话。语气热情但不油腻，像朋友介绍好东西那种。中文客户我会用微信那种口语，短句子，偶尔用一下"哈哈"。英文的话就是简单直接的美式专业，contractions 用得多，不写那种很正式的商业腔。`;

export function VoiceSettings({
  orgId,
  initialVoice,
  initialSignature,
}: {
  orgId?: string;
  initialVoice?: string | null;
  initialSignature?: string | null;
}) {
  const [voiceProfile, setVoiceProfile] = useState(initialVoice ?? "");
  const [signatureName, setSignatureName] = useState(initialSignature ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Your Voice
          </CardTitle>
          <CardDescription>
            The single most important setting. Write 3–5 sentences describing how you actually write
            emails and talk on the phone — your rhythm, your words, how casual or direct you are.
            The AI mirrors this in <strong>every</strong> email, reply, and call script, so nothing sounds
            like generic AI. Write it in whatever mix of English/中文 feels natural to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            placeholder="e.g. I keep it short and direct — no corporate fluff. I open with the person's name and one concrete reason I'm reaching out. I use real details (the actual street, the actual price). Warm but not salesy. For Chinese clients I write like WeChat — short, casual, spoken..."
            value={voiceProfile}
            onChange={(e) => { setVoiceProfile(e.target.value); setSaved(false); }}
            className="resize-none text-sm leading-relaxed"
          />
          <button
            type="button"
            onClick={() => { setVoiceProfile(VOICE_EXAMPLE); setSaved(false); }}
            className="text-xs text-primary hover:underline"
          >
            ↩ Use example (中文) as a starting point
          </button>
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Tips for a strong voice sample:</p>
            <p>• Paste 2–3 lines from a real email/text you actually sent — that's the fastest way.</p>
            <p>• Mention your quirks: do you use short lines? emoji? drop formalities? 用中文口语?</p>
            <p>• Describe both channels: how you write vs. how you sound on a call.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How you sign off</CardTitle>
          <CardDescription>The name the AI uses to sign emails and open calls.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Kanghuan (or 康欢, or however you introduce yourself)"
            value={signatureName}
            onChange={(e) => { setSignatureName(e.target.value); setSaved(false); }}
          />
        </CardContent>
      </Card>

      <form
        action={async () => {
          if (!orgId) return;
          await saveVoiceProfile(orgId, { voiceProfile, signatureName });
          setSaved(true);
        }}
      >
        <Button type="submit" className="w-full gap-2">
          {saved ? (<><Check className="h-4 w-4" /> Saved — every draft now uses your voice</>) : "Save my voice"}
        </Button>
      </form>
    </div>
  );
}
