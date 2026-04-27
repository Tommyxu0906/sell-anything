"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { completeOnboarding } from "@/lib/actions/onboard";
import { Zap, ArrowRight, ArrowLeft, Check } from "lucide-react";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const INDUSTRY_SUGGESTIONS = ["SaaS", "FinTech", "HealthTech", "E-commerce", "Manufacturing", "Real Estate", "Professional Services"];
const TITLE_SUGGESTIONS = ["CEO", "VP Sales", "Founder", "CTO", "Head of Growth", "Revenue Operations", "Director of Sales"];

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    whatYouSell: "",
    targetIndustries: [] as string[],
    targetJobTitles: [] as string[],
    companySize: "11-50",
    brandVoice: "",
  });

  function toggleTag(field: "targetIndustries" | "targetJobTitles", value: string) {
    setData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <span className="font-semibold">sellAnything</span>
        <span className="mx-4 text-muted-foreground">·</span>
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                n < step
                  ? "bg-primary text-primary-foreground"
                  : n === step
                  ? "border-2 border-primary text-primary"
                  : "border text-muted-foreground"
              }`}
            >
              {n < step ? <Check className="h-3 w-3" /> : n}
            </div>
            {n < 3 && <div className={`h-px w-8 ${n < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">
        {/* Step 1: What you sell */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What does your company sell?</CardTitle>
              <CardDescription>
                Describe your product or service in 1–2 sentences. The AI uses this to write personalized emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="We help B2B SaaS companies automate their outbound sales with AI, so their reps can focus on closing deals instead of prospecting."
                rows={4}
                value={data.whatYouSell}
                onChange={(e) => setData({ ...data, whatYouSell: e.target.value })}
                className="resize-none"
              />
              <Button
                className="w-full"
                disabled={data.whatYouSell.trim().length < 20}
                onClick={() => setStep(2)}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Who you target */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Who is your ideal customer?</CardTitle>
              <CardDescription>
                Pick the industries and job titles you want to target. AI scores every lead against this.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium">Industries</p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_SUGGESTIONS.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleTag("targetIndustries", ind)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        data.targetIndustries.includes(ind)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-primary hover:text-primary"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
                <Input
                  className="mt-2"
                  placeholder="Add custom industries, comma-separated"
                  onBlur={(e) => {
                    if (e.target.value) {
                      e.target.value.split(",").forEach((v) => {
                        const trimmed = v.trim();
                        if (trimmed && !data.targetIndustries.includes(trimmed))
                          setData((prev) => ({ ...prev, targetIndustries: [...prev.targetIndustries, trimmed] }));
                      });
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Job titles to target</p>
                <div className="flex flex-wrap gap-2">
                  {TITLE_SUGGESTIONS.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => toggleTag("targetJobTitles", title)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        data.targetJobTitles.includes(title)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-primary hover:text-primary"
                      }`}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Company size</p>
                <div className="flex gap-2">
                  {COMPANY_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setData({ ...data, companySize: size })}
                      className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                        data.companySize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-primary"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={data.targetIndustries.length === 0 || data.targetJobTitles.length === 0}
                  onClick={() => setStep(3)}
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Brand voice + launch */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>How do you want to sound?</CardTitle>
              <CardDescription>
                Describe your email tone. The AI will match it in every message it writes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={async (fd) => {
                  fd.set("whatYouSell", data.whatYouSell);
                  fd.set("targetIndustries", data.targetIndustries.join(", "));
                  fd.set("targetJobTitles", data.targetJobTitles.join(", "));
                  fd.set("companySize", data.companySize);
                  await completeOnboarding(fd);
                }}
                className="space-y-4"
              >
                <input type="hidden" name="whatYouSell" value={data.whatYouSell} />
                <input type="hidden" name="targetIndustries" value={data.targetIndustries.join(", ")} />
                <input type="hidden" name="targetJobTitles" value={data.targetJobTitles.join(", ")} />
                <input type="hidden" name="companySize" value={data.companySize} />

                <div className="flex flex-wrap gap-2">
                  {["Professional & direct", "Friendly & casual", "Bold & provocative", "Data-driven"].map((voice) => (
                    <button
                      key={voice}
                      type="button"
                      onClick={() => setData({ ...data, brandVoice: voice })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        data.brandVoice === voice
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-primary"
                      }`}
                    >
                      {voice}
                    </button>
                  ))}
                </div>

                <Textarea
                  name="brandVoice"
                  placeholder="Or describe in your own words: e.g. 'Concise and direct, like a smart friend who gets to the point.'"
                  rows={3}
                  value={data.brandVoice}
                  onChange={(e) => setData({ ...data, brandVoice: e.target.value })}
                  className="resize-none"
                />

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                  <p className="font-medium text-primary">🚀 After you click Launch, AI immediately:</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• Starts prospecting leads matching your ICP</li>
                    <li>• Creates a personalized 4-email sequence</li>
                    <li>• Drafts your first batch of outreach emails</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    <Zap className="mr-2 h-4 w-4" /> Launch AI Agent
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
