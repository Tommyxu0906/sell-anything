"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { completeOnboarding } from "@/lib/actions/onboard";
import { INDUSTRY_PRESETS } from "@/lib/data/industry-presets";
import type { GeneratedPlaybook } from "@/lib/ai/generate-playbook";
import { Zap, ArrowRight, ArrowLeft, Check, Sparkles, Loader2, Edit2 } from "lucide-react";

const STRATEGY_LABELS = {
  aggressive: { label: "Aggressive", desc: "5 touches in 2 weeks" },
  balanced: { label: "Balanced", desc: "4 touches over 1 month" },
  nurture: { label: "Nurture", desc: "6 touches over 2–3 months" },
  enterprise: { label: "Enterprise", desc: "5 touches over 6–8 weeks" },
};

const TONE_LABELS = {
  professional: "Professional",
  consultative: "Consultative",
  direct: "Direct",
  casual: "Casual",
  challenger: "Challenger",
};

export default function OnboardPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [description, setDescription] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [generatedPlaybook, setGeneratedPlaybook] = useState<GeneratedPlaybook | null>(null);
  const [editedPlaybook, setEditedPlaybook] = useState<GeneratedPlaybook | null>(null);
  const [generating, startGenerating] = useTransition();
  const [generationError, setGenerationError] = useState<string | null>(null);

  const playbook = editedPlaybook ?? generatedPlaybook;

  async function handleGenerateStrategy() {
    setGenerationError(null);
    startGenerating(async () => {
      const res = await fetch("/api/generate-playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, industryPresetId: selectedPreset }),
      });
      if (!res.ok) {
        setGenerationError("Failed to generate strategy. Please try again.");
        return;
      }
      const data: GeneratedPlaybook = await res.json();
      setGeneratedPlaybook(data);
      setEditedPlaybook(data);
      setStep(2);
    });
  }

  function updatePlaybook(patch: Partial<GeneratedPlaybook>) {
    setEditedPlaybook((prev) => prev ? { ...prev, ...patch } : null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Zap className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">sellAnything</span>
        <span className="mx-2 text-muted-foreground">·</span>
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              n < step ? "bg-primary text-primary-foreground"
              : n === step ? "border-2 border-primary text-primary"
              : "border text-muted-foreground"
            }`}>
              {n < step ? <Check className="h-3 w-3" /> : n}
            </div>
            {n < 3 && <div className={`h-px w-8 transition-colors ${n < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl space-y-4">
        {/* ─── Step 1: Describe + industry ──────────────────────────────────── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What does your company sell?</CardTitle>
              <CardDescription>
                Describe in 1–3 sentences. The AI reads this and builds your entire sales strategy — ICP, email sequence, objection handlers, everything.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Textarea
                placeholder="We sell AI-powered inventory software to mid-size e-commerce brands. Our system predicts stockouts 30 days in advance and auto-reorders, saving ops teams 10+ hours per week."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
              />

              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Pick an industry (optional — helps AI tune strategy)
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {INDUSTRY_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPreset(selectedPreset === preset.id ? null : preset.id)}
                      className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                        selectedPreset === preset.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:border-muted-foreground/50"
                      }`}
                    >
                      <span className="block text-base leading-none">{preset.emoji}</span>
                      <span className="mt-1 block leading-tight">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {generationError && (
                <p className="text-sm text-destructive">{generationError}</p>
              )}

              <Button
                className="w-full"
                disabled={description.trim().length < 20 || generating}
                onClick={handleGenerateStrategy}
              >
                {generating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your strategy…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate My Sales Strategy</>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Takes ~5 seconds · AI writes your ICP, email sequence, objection handlers, and brand voice
              </p>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 2: Review + edit AI-generated strategy ──────────────────── */}
        {step === 2 && playbook && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Your AI-generated strategy</h2>
                <p className="text-sm text-muted-foreground">Review and edit anything — click any field to change it.</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> AI-generated
              </Badge>
            </div>

            {/* Value prop */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Value Proposition <Edit2 className="h-3 w-3" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={playbook.valueProp}
                  onChange={(e) => updatePlaybook({ valueProp: e.target.value })}
                  rows={2}
                  className="resize-none text-sm"
                />
              </CardContent>
            </Card>

            {/* ICP */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ideal Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={playbook.icpDescription}
                  onChange={(e) => updatePlaybook({ icpDescription: e.target.value })}
                  rows={2}
                  className="resize-none text-sm"
                  placeholder="ICP description..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Target industries</p>
                    <Input
                      value={playbook.targetIndustries.join(", ")}
                      onChange={(e) => updatePlaybook({
                        targetIndustries: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Target job titles</p>
                    <Input
                      value={playbook.targetJobTitles.join(", ")}
                      onChange={(e) => updatePlaybook({
                        targetJobTitles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tone + Strategy */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tone & Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Email tone</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(TONE_LABELS) as [GeneratedPlaybook["tone"], string][]).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updatePlaybook({ tone: key })}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          playbook.tone === key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:border-primary/50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Sequence strategy</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(STRATEGY_LABELS) as [GeneratedPlaybook["sequenceStrategy"], typeof STRATEGY_LABELS[keyof typeof STRATEGY_LABELS]][]).map(([key, meta]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updatePlaybook({ sequenceStrategy: key })}
                        className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                          playbook.sequenceStrategy === key
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:border-muted-foreground/40"
                        }`}
                      >
                        <span className="font-semibold">{meta.label}</span>
                        <span className="mt-0.5 block text-muted-foreground">{meta.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Brand voice</p>
                  <Textarea
                    value={playbook.brandVoice}
                    onChange={(e) => updatePlaybook({ brandVoice: e.target.value })}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sample email preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sample First Email (AI Preview)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  value={playbook.sampleEmail.subject}
                  onChange={(e) => updatePlaybook({ sampleEmail: { ...playbook.sampleEmail, subject: e.target.value } })}
                  className="text-sm font-medium"
                  placeholder="Subject..."
                />
                <Textarea
                  value={playbook.sampleEmail.body}
                  onChange={(e) => updatePlaybook({ sampleEmail: { ...playbook.sampleEmail, body: e.target.value } })}
                  rows={5}
                  className="resize-none text-sm"
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Looks good <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* ─── Step 3: Launch ────────────────────────────────────────────────── */}
        {step === 3 && playbook && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to launch your AI sales agent</CardTitle>
              <CardDescription>
                Your strategy is set. The AI will start prospecting and drafting emails immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={async (fd) => {
                  fd.set("playbookJson", JSON.stringify(playbook));
                  fd.set("description", description);
                  await completeOnboarding(fd);
                }}
                className="space-y-5"
              >
                <input type="hidden" name="playbookJson" value={JSON.stringify(playbook)} />
                <input type="hidden" name="description" value={description} />

                <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Strategy</span>
                    <span className="font-medium">{STRATEGY_LABELS[playbook.sequenceStrategy]?.label} — {STRATEGY_LABELS[playbook.sequenceStrategy]?.desc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tone</span>
                    <span className="font-medium">{TONE_LABELS[playbook.tone]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sequence steps</span>
                    <span className="font-medium">{playbook.sequenceSteps.length} emails</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Objection handlers</span>
                    <span className="font-medium">{playbook.objectionHandlers.length} configured</span>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                  <p className="font-semibold text-primary flex items-center gap-1">
                    <Zap className="h-4 w-4" /> After launch, your AI agent immediately:
                  </p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• Starts prospecting {playbook.targetJobTitles.slice(0, 2).join(", ")} at {playbook.targetIndustries.slice(0, 2).join(", ")} companies</li>
                    <li>• Creates a {playbook.sequenceSteps.length}-step {STRATEGY_LABELS[playbook.sequenceStrategy]?.label.toLowerCase()} sequence</li>
                    <li>• Drafts personalized emails for your first leads</li>
                    <li>• Learns from every edit you make to write better over time</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Edit strategy
                  </Button>
                  <Button type="submit" className="flex-1 gap-2">
                    <Zap className="h-4 w-4" /> Launch AI Agent
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
