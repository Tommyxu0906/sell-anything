import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireOrg } from "@/lib/auth/current-org";
import { getPriorities, type PriorityItem, type PrioritiesResult } from "@/lib/data/priorities";
import {
  MessageSquare, Flame, Snowflake, FileCheck, Phone, ArrowRight, Home, Shield, CheckCircle2,
} from "lucide-react";
import Link from "next/link";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function LineBadge({ line }: { line: string | null }) {
  if (line === "life_insurance") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <Shield className="h-2.5 w-2.5" /> Insurance
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
      <Home className="h-2.5 w-2.5" /> Real Estate
    </span>
  );
}

function PriorityRow({ item }: { item: PriorityItem }) {
  const { contact, reason, bucket } = item;
  const name = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || contact.email || "Unknown contact";
  const line = contact.businessLine ?? "real_estate";
  // review + reply route to the inbox; hot/cold to the contact + call prep
  const primaryHref = bucket === "review" || bucket === "reply"
    ? `/inbox?line=${line}`
    : `/contacts?line=${line}`;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{name}</p>
          <LineBadge line={contact.businessLine} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{reason}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {(bucket === "hot" || bucket === "cold") && contact.phone && (
          <Link href={`/call-prep/${contact.id}`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
              <Phone className="h-3.5 w-3.5" /> Prep Call
            </Button>
          </Link>
        )}
        <Link href={primaryHref}>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
            {bucket === "review" ? "Review" : bucket === "reply" ? "Respond" : "Open"}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function BucketCard({
  title, subtitle, icon: Icon, accent, items,
}: {
  title: string; subtitle: string; icon: React.ElementType; accent: string; items: PriorityItem[];
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${accent}`} />
          {title}
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {items.length}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {items.map((item) => <PriorityRow key={item.contact.id} item={item} />)}
      </CardContent>
    </Card>
  );
}

function buildSummary(p: PrioritiesResult): string {
  if (p.totalActionable === 0) return "";
  const parts: string[] = [];
  if (p.reply.length) parts.push(`${p.reply.length} ${p.reply.length === 1 ? "person" : "people"} waiting on your reply`);
  if (p.hot.length) parts.push(`${p.hot.length} hot lead${p.hot.length === 1 ? "" : "s"} who just opened your email`);
  if (p.review.length) parts.push(`${p.review.length} draft${p.review.length === 1 ? "" : "s"} to review`);
  if (p.cold.length) parts.push(`${p.cold.length} going cold`);
  const list = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(", ") + ", and " + parts.slice(-1);
  return `You've got ${list}. Start at the top — those are the warmest.`;
}

export default async function PrioritiesPage() {
  let p: PrioritiesResult = { reply: [], hot: [], cold: [], review: [], totalActionable: 0 };

  try {
    const org = await requireOrg();
    p = await getPriorities(org.id);
  } catch {
    // DB not connected — show empty state
  }

  const summary = buildSummary(p);

  return (
    <div>
      <Header title="Today" />
      <div className="p-6 space-y-5 max-w-3xl">

        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}, Kanghuan 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {p.totalActionable === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-green-500" />
              <p className="font-medium text-foreground">You're all caught up.</p>
              <p className="text-sm mt-1">No one needs a follow-up right now. New leads and replies will show up here.</p>
              <Link href="/contacts" className="inline-block mt-4">
                <Button variant="outline" size="sm">Browse contacts</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>

            <BucketCard
              title="Needs your reply"
              subtitle="They wrote back and are waiting — respond today so you don't go cold."
              icon={MessageSquare}
              accent="text-green-600"
              items={p.reply}
            />
            <BucketCard
              title="Hot — opened, no reply"
              subtitle="They just read your email. A quick call or nudge now converts best."
              icon={Flame}
              accent="text-red-500"
              items={p.hot}
            />
            <BucketCard
              title="Drafts to review"
              subtitle="The AI wrote these in your voice — approve or tweak, then send."
              icon={FileCheck}
              accent="text-primary"
              items={p.review}
            />
            <BucketCard
              title="Going cold"
              subtitle="You had momentum here. A light touch keeps it alive."
              icon={Snowflake}
              accent="text-blue-500"
              items={p.cold}
            />
          </>
        )}
      </div>
    </div>
  );
}
