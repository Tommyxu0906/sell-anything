import Link from "next/link";
import { Zap, Search, Mail, RefreshCw, Calendar, Sliders, ArrowRight, Check } from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Auto-Prospecting",
    description: "AI finds leads matching your ideal customer profile. New prospects added daily — zero manual research.",
  },
  {
    icon: Mail,
    title: "Personalized Outreach",
    description: "Claude AI writes emails tailored to each prospect using their company context, not mail-merge templates.",
  },
  {
    icon: RefreshCw,
    title: "Smart Follow-ups",
    description: "Multi-touch sequences that respect time zones, skip weekends, and stop the moment someone replies.",
  },
  {
    icon: Zap,
    title: "Reply Handling",
    description: "AI reads every reply, classifies intent, and drafts your response. You approve in one click.",
  },
  {
    icon: Calendar,
    title: "Meeting Booking",
    description: "Connects to Google Calendar. When a prospect is interested, AI proposes times and books the meeting.",
  },
  {
    icon: Sliders,
    title: "Autonomy Control",
    description: "Dial from full human review to full autopilot — per channel, per action type. You're always in control.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$99",
    description: "For solo founders testing outbound.",
    features: ["1 user", "500 leads/month", "Email sequences", "Inbox review queue", "Google Calendar"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$299",
    description: "For growing sales teams.",
    features: ["5 users", "2,000 leads/month", "Email + SMS", "Calendar booking", "Apollo prospecting", "Autonomy controls"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For teams that need more.",
    features: ["Unlimited users", "Unlimited leads", "Custom integrations", "Dedicated CSM", "SLA + compliance"],
    cta: "Contact sales",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">sellAnything</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#features" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              Features
            </Link>
            <Link href="#pricing" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              Pricing
            </Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          Powered by Claude AI
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
          Your AI sales rep
          <br />
          <span className="text-primary">that never stops working</span>
        </h1>
        <p className="mb-10 text-xl text-muted-foreground">
          Set up in 3 minutes. Watch AI prospect, personalize outreach, handle replies,
          <br className="hidden sm:block" />
          and book meetings — while you focus on closing.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="#features" className="rounded-md border px-6 py-3 font-medium hover:bg-accent">
            See how it works
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">No credit card required · 14-day free trial</p>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/40 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Up and running in 3 minutes</h2>
          <p className="mb-12 text-center text-muted-foreground">No complex setup. No API keys to juggle. Just tell the AI what you want.</p>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Tell AI what you sell",
                desc: "Describe your product in 2 sentences. The AI learns your value prop, brand voice, and handles objections automatically.",
              },
              {
                step: "2",
                title: "Define your ideal customer",
                desc: "Pick the industry, company size, and job titles you target. AI uses this to find and score prospects daily.",
              },
              {
                step: "3",
                title: "Watch it work",
                desc: "AI prospects, sends personalized emails, handles replies, and books meetings. You just approve or let it run.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative rounded-xl border bg-background p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step}
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Everything a sales rep does — automated</h2>
          <p className="mb-12 text-center text-muted-foreground">From first touch to booked meeting, the AI handles the entire outbound motion.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border p-6 hover:border-primary/50 transition-colors">
                <Icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/40 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {[
              { stat: "10×", label: "More outreach volume vs manual" },
              { stat: "3 min", label: "Average setup time" },
              { stat: "24/7", label: "AI works around the clock" },
            ].map(({ stat, label }) => (
              <div key={stat}>
                <p className="mb-1 text-4xl font-bold">{stat}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Simple, transparent pricing</h2>
          <p className="mb-12 text-center text-muted-foreground">14-day free trial on all plans. Cancel anytime.</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {PLANS.map(({ name, price, description, features, cta, highlight }) => (
              <div
                key={name}
                className={`relative flex flex-col rounded-xl border p-6 ${highlight ? "border-primary bg-primary/5 shadow-lg" : "bg-background"}`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-semibold">{name}</h3>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-3xl font-bold">{price}</span>
                    {price !== "Custom" && <span className="mb-1 text-sm text-muted-foreground">/mo</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                <ul className="mb-6 flex-1 space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={price === "Custom" ? "mailto:sales@sellanything.app" : "/signup"}
                  className={`block rounded-md py-2 text-center text-sm font-medium transition-colors ${
                    highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border hover:bg-accent"
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to put your outbound on autopilot?</h2>
          <p className="mb-8 opacity-90">Join hundreds of sales teams using AI to do the work that doesn't scale.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-background px-6 py-3 font-medium text-foreground hover:bg-background/90"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-primary" />
            sellAnything
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <a href="mailto:hello@sellanything.app" className="hover:text-foreground">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">Built with Claude AI by Anthropic</p>
        </div>
      </footer>
    </div>
  );
}
