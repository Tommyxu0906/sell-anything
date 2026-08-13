import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startIntake } from "@/lib/actions/offerings";
import { Sparkles, ArrowRight } from "lucide-react";

const EXAMPLES = [
  "A project-management SaaS for small marketing agencies, $49/user/mo.",
  "Handmade soy candles sold direct-to-consumer, $28 each.",
  "A local HVAC repair and installation service in the Boston area.",
  "Enterprise cybersecurity software for hospitals, six-figure contracts.",
];

const SELECT_CLASS =
  "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function OnboardPage() {
  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">What are you selling?</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Describe it once. We&apos;ll research the market and tell you which channels actually fit —
            email, calls, SEO, paid, social — with the data behind each call.
          </p>
        </div>

        <form action={startIntake} className="space-y-5 rounded-xl border bg-background p-6">
          <Field label="Name" hint="What do you call it?">
            <Input name="name" required placeholder="e.g. Acme Project Hub" />
          </Field>

          <Field label="Description" hint="What it is, who it's for, roughly what it costs. 1–3 sentences.">
            <Textarea
              name="description"
              required
              rows={3}
              className="resize-none"
              placeholder={EXAMPLES[0]}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex, i) => (
                <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {ex.length > 46 ? ex.slice(0, 46) + "…" : ex}
                </span>
              ))}
            </div>
          </Field>

          <Field label="Website" hint="Optional — used as a research signal.">
            <Input name="url" type="url" placeholder="https://…" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Who buys it?">
              <select name="audienceType" defaultValue="b2b" className={SELECT_CLASS}>
                <option value="b2b">Businesses (B2B)</option>
                <option value="b2c">Consumers (B2C)</option>
                <option value="local">Local customers</option>
                <option value="mixed">Mixed</option>
              </select>
            </Field>

            <Field label="Price band">
              <select name="priceBand" defaultValue="mid" className={SELECT_CLASS}>
                <option value="low">Low (&lt; $200)</option>
                <option value="mid">Mid ($200–5k)</option>
                <option value="high">High ($5k–50k)</option>
                <option value="enterprise">Enterprise ($50k+)</option>
              </select>
            </Field>

            <Field label="Sales cycle">
              <select name="salesCycle" defaultValue="medium" className={SELECT_CLASS}>
                <option value="impulse">Impulse (instant)</option>
                <option value="short">Short (days)</option>
                <option value="medium">Medium (weeks)</option>
                <option value="long">Long (months)</option>
              </select>
            </Field>

            <Field label="Geography">
              <select name="geoScope" defaultValue="national" className={SELECT_CLASS}>
                <option value="local">Local</option>
                <option value="regional">Regional</option>
                <option value="national">National</option>
                <option value="global">Global</option>
              </select>
            </Field>
          </div>

          <Button type="submit" className="w-full gap-2">
            Research my market <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Takes ~1–2 minutes. You&apos;ll get a ranked channel strategy with the evidence behind it.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {hint && <p className="text-xs text-muted-foreground -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}
