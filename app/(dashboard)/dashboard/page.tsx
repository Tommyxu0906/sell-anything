import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { contacts, messages, activities, offerings, channelStrategies } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, count, desc, inArray } from "drizzle-orm";
import { CHANNEL_LABELS, type Channel } from "@/lib/strategy/channel-model";
import { Users, Mail, MessageSquare, Package, Plus, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Header } from "@/components/dashboard/header";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface DashData {
  offerings: (typeof offerings.$inferSelect)[];
  recommendedByOffering: Record<string, Channel[]>;
  stats: { leads: number; sent: number; replies: number };
  recentActivity: (typeof activities.$inferSelect)[];
}

async function getDashboardData(orgId: string): Promise<DashData> {
  const offeringRows = await db
    .select()
    .from(offerings)
    .where(eq(offerings.orgId, orgId))
    .orderBy(desc(offerings.createdAt));

  const offeringIds = offeringRows.map((o) => o.id);

  const [strategies, [{ leads }], [{ sent }], [{ replies }], recentActivity] = await Promise.all([
    offeringIds.length
      ? db.select().from(channelStrategies).where(inArray(channelStrategies.offeringId, offeringIds)).orderBy(desc(channelStrategies.createdAt))
      : Promise.resolve([] as (typeof channelStrategies.$inferSelect)[]),
    db.select({ leads: count() }).from(contacts).where(eq(contacts.orgId, orgId)),
    db.select({ sent: count() }).from(messages).where(eq(messages.orgId, orgId)),
    db.select({ replies: count() }).from(messages).where(eq(messages.orgId, orgId)),
    db.select().from(activities).where(eq(activities.orgId, orgId)).orderBy(desc(activities.createdAt)).limit(10),
  ]);

  const recommendedByOffering: Record<string, Channel[]> = {};
  for (const s of strategies) {
    if (!recommendedByOffering[s.offeringId]) {
      recommendedByOffering[s.offeringId] = (s.recommended as Channel[]) ?? [];
    }
  }

  return { offerings: offeringRows, recommendedByOffering, stats: { leads, sent, replies }, recentActivity };
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  researching: { label: "Researching", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  ready: { label: "Ready", cls: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  active: { label: "Active", cls: "bg-primary/10 text-primary" },
};

const ACTIVITY_ICONS: Record<string, string> = {
  email_sent: "✉️", replied: "💬", stage_changed: "📋", note: "📝", meeting_booked: "📅",
};

export default async function DashboardPage() {
  let data: DashData = {
    offerings: [], recommendedByOffering: {}, stats: { leads: 0, sent: 0, replies: 0 }, recentActivity: [],
  };
  let orgName: string | undefined;

  try {
    const org = await requireOrg();
    orgName = org.name;
    data = await getDashboardData(org.id);
  } catch {
    // DB not connected
  }

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}{orgName ? `, ${orgName}` : ""} 👋</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link href="/onboard">
            <Button className="gap-2"><Plus className="h-4 w-4" /> New offering</Button>
          </Link>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-4">
          <Stat icon={Users} label="Contacts" value={data.stats.leads} />
          <Stat icon={Mail} label="Messages" value={data.stats.sent} />
          <Stat icon={MessageSquare} label="Replies" value={data.stats.replies} />
        </div>

        {/* Offerings */}
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Package className="h-4 w-4" /> Your offerings
          </h2>

          {data.offerings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="font-medium">Add your first offering</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Describe what you&apos;re selling and we&apos;ll research the market and build a
                  data-backed channel strategy.
                </p>
                <Link href="/onboard" className="inline-block mt-4">
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Get started</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.offerings.map((o) => {
                const rec = data.recommendedByOffering[o.id] ?? [];
                const badge = STATUS_BADGE[o.status ?? "draft"];
                return (
                  <Card key={o.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-semibold truncate">{o.name}</CardTitle>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${badge.cls}`}>
                          {o.status === "researching" && <Loader2 className="inline h-2.5 w-2.5 mr-1 animate-spin" />}
                          {badge.label}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground line-clamp-2">{o.description}</p>
                      {rec.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rec.slice(0, 3).map((c) => (
                            <Badge key={c} variant="secondary" className="text-[10px]">
                              {CHANNEL_LABELS[c] ?? c}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Link href={`/offerings/${o.id}/strategy`}>
                        <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                          {o.status === "ready" || o.status === "active" ? "View strategy" : "View progress"}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity */}
        {data.recentActivity.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-1.5 text-sm border-b last:border-0">
                    <span className="text-base leading-none mt-0.5">{ACTIVITY_ICONS[a.type] ?? "•"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
