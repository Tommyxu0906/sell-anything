"use client";

import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CallScript } from "@/lib/ai/generate-call-script";
import {
  Phone, Voicemail, MessageSquare, ChevronRight,
  Loader2, Sparkles, Copy, Check, ArrowLeft
} from "lucide-react";
import Link from "next/link";

const PURPOSE_OPTIONS = [
  { value: "intro", label: "First call", desc: "They don't know you yet" },
  { value: "follow_up", label: "Follow-up", desc: "After emails sent" },
  { value: "re_engage", label: "Re-engage", desc: "Went cold" },
  { value: "close", label: "Close", desc: "They've shown interest" },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ScriptSection({ title, icon: Icon, text, accent }: {
  title: string; icon: React.ElementType; text: string; accent?: string;
}) {
  return (
    <Card className={accent ? `border-l-4 ${accent}` : ""}>
      <CardHeader className="flex flex-row items-center pb-2 pt-4 px-4">
        <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CopyButton text={text} />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      </CardContent>
    </Card>
  );
}

export default function CallPrepPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = use(params);
  const [purpose, setPurpose] = useState<"intro" | "follow_up" | "re_engage" | "close">("intro");
  const [script, setScript] = useState<CallScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<number>(0);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/call-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, callPurpose: purpose }),
      });
      if (!res.ok) throw new Error("Failed to generate script");
      const data = await res.json();
      setScript(data);
      setActiveSection(0);
    } catch (e) {
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/contacts`}>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <h1 className="text-lg font-semibold">Call Prep</h1>
          </div>
          <Badge variant="outline" className="ml-auto text-xs">AI-generated · review before calling</Badge>
        </div>

        {/* Purpose selector */}
        {!script && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <p className="text-sm font-medium">What's the purpose of this call?</p>
              <div className="grid grid-cols-2 gap-2">
                {PURPOSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPurpose(opt.value)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      purpose === opt.value
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/40"
                    }`}
                  >
                    <span className="font-medium block">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full gap-2" onClick={generate} disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating script…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate Call Script</>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Reads your contact history + playbook · takes ~5 seconds
              </p>
            </CardContent>
          </Card>
        )}

        {/* Script display */}
        {script && (
          <>
            {/* Step-by-step flow */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {["Opener", "Bridge", "Talking Points", "Objections", "CTA", "Voicemail", "Follow-up"].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSection(i)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    activeSection === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:border-muted-foreground/40 text-muted-foreground"
                  }`}
                >
                  {i + 1}. {label}
                </button>
              ))}
            </div>

            {/* Active section detail (tap-through mode for during the call) */}
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardContent className="pt-5 pb-4 space-y-3">
                {activeSection === 0 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opener — say this when they pick up</p>
                    <p className="text-base leading-relaxed font-medium">{script.opener}</p>
                  </>
                )}
                {activeSection === 1 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Context bridge</p>
                    <p className="text-base leading-relaxed">{script.contextBridge}</p>
                  </>
                )}
                {activeSection === 2 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Talking points</p>
                    <div className="space-y-3">
                      {script.talkingPoints.map((tp, i) => (
                        <div key={i} className="border-l-2 border-primary/40 pl-3">
                          <p className="font-medium text-sm">{tp.point}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tp.detail}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {activeSection === 3 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">If they push back</p>
                    <div className="space-y-3">
                      {script.objectionHandlers.map((oh, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-xs text-muted-foreground italic">"{oh.objection}"</p>
                          <p className="text-sm">{oh.response}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {activeSection === 4 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Call to action — ask for exactly this</p>
                    <p className="text-base font-semibold text-primary">{script.callToAction}</p>
                  </>
                )}
                {activeSection === 5 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Voicemail className="h-3 w-3" /> Voicemail — if no answer
                    </p>
                    <p className="text-base leading-relaxed">{script.voicemailScript}</p>
                  </>
                )}
                {activeSection === 6 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Send this after the call
                    </p>
                    <p className="text-base">{script.followUpNote}</p>
                  </>
                )}

                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={activeSection === 0}
                    onClick={() => setActiveSection(s => s - 1)}
                  >← Prev</Button>
                  <Button
                    size="sm"
                    disabled={activeSection === 6}
                    onClick={() => setActiveSection(s => s + 1)}
                  >Next <ChevronRight className="ml-1 h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>

            {/* Full script below (for reference) */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground py-2">
                View full script
              </summary>
              <div className="mt-3 space-y-3">
                <ScriptSection title="Opener" icon={Phone} text={script.opener} accent="border-green-400" />
                <ScriptSection title="Context bridge" icon={MessageSquare} text={script.contextBridge} />
                {script.talkingPoints.map((tp, i) => (
                  <ScriptSection key={i} title={`Talking point ${i + 1}`} icon={ChevronRight} text={`${tp.point}\n\n↳ ${tp.detail}`} />
                ))}
                {script.objectionHandlers.map((oh, i) => (
                  <ScriptSection key={i} title={`If: "${oh.objection}"`} icon={MessageSquare} text={oh.response} />
                ))}
                <ScriptSection title="Your ask" icon={Phone} text={script.callToAction} accent="border-primary" />
                <ScriptSection title="Voicemail" icon={Voicemail} text={script.voicemailScript} accent="border-orange-400" />
                <ScriptSection title="Follow-up text/email" icon={MessageSquare} text={script.followUpNote} />
              </div>
            </details>

            <Button variant="outline" className="w-full" onClick={() => { setScript(null); }}>
              Regenerate with different purpose
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
