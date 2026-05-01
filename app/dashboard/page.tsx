import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { contacts, messages, activities, sequences } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, and, count, desc } from "drizzle-orm";
import { Users, Mail, MessageSquare, Home, Shield, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Header } from "@/components/dashboard/header";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

async function getLineData(orgId: string, businessLine: string) {
  const [
    [{ leads }],
    [{ pending }],
    [{ sent }],
    [{ replies }],
  ] = await Promise.all([
    db.select({ leads: count() }).from(contacts)
      .where(and(eq(contacts.orgId, orgId), eq(contacts.businessLine, businessLine))),
    db.select({ pending: count() }).from(messages)
      .where(and(eq(messages.orgId, orgId), eq(messages.reviewStatus, "pending"))),
    db.select({ sent: count() }).from(messages)
      .where(and(eq(messages.orgId, orgId), eq(messages.reviewStatus, "sent"))),
    db.select({ replies: count() }).from(messages)
      .where(and(eq(messages.orgId, orgId), eq(messages.direction, "inbound"))),
  ]);
  return { leads, pending, sent, replies };
}

async function getDashboardData(orgId: string) {
  const [re, ins, recentActivity] = await Promise.all([
    getLineData(orgId, "real_estate"),
    getLineData(orgId, "life_insurance"),
    db.select().from(activities).where(eq(activities.orgId, orgId))
      .orderBy(desc(activities.createdAt)).limit(12),
  ]);
  return { re, ins, recentActivity };
}

const LINE_ACTIVITY_ICONS: Record<string, string> = {
  email_sent: "✉️",
  replied: "💬",
  stage_changed: "📋",
  note: "📝",
  meeting_booked: "📅",
};

export default async function DashboardPage() {
  let data = {
    re: { leads: 0, pending: 0, sent: 0, replies: 0 },
    ins: { leads: 0, pending: 0, sent: 0, replies: 0 },
    recentActivity: [] as (typeof activities.$inferSelect)[],
  };

  try {
    const org = await requireOrg();
    data = await getDashboardData(org.id);
  } catch {
    // DB not connected — show empty state
  }

  const totalPending = data.re.pending + data.ins.pending;

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">

        {/* Personal greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, Kanghuan 👋</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          {totalPending > 0 && (
            <Link href="/inbox">
              <Button className="gap-2">
                <Clock className="h-4 w-4" />
                {totalPending} draft{totalPending !== 1 ? "s" : ""} to review
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>

        {/* Two-panel business line overview */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Real Estate */}
          <Card className="border-orange-200/60 bg-orange-50/30 dark:border-orange-900/30 dark:bg-orange-950/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10">
                    <Home className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Real Estate</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Prophet Homes</p>
                  </div>
                </div>
                {data.re.pending > 0 && (
                  <Badge variant="destructive" className="text-xs">{data.re.pending} pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{data.re.leads}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Leads</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.re.sent}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Mail className="h-3 w-3" /> Sent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.re.replies}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><MessageSquare className="h-3 w-3" /> Replies</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Link href="/inbox?line=real_estate" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">Inbox</Button>
                </Link>
                <Link href="/contacts?line=real_estate" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">Contacts</Button>
                </Link>
                <Link href="/sequences?line=real_estate" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">Sequences</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Life Insurance */}
          <Card className="border-blue-200/60 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Life Insurance</CardTitle>
                    <p className="text-[10px] text-muted-foreground">National Life Group</p>
                  </div>
                </div>
                {data.ins.pending > 0 && (
                  <Badge variant="destructive" className="text-xs">{data.ins.pending} pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{data.ins.leads}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Leads</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.ins.sent}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Mail className="h-3 w-3" /> Sent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.ins.replies}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><MessageSquare className="h-3 w-3" /> Replies</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Link href="/inbox?line=life_insurance" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">Inbox</Button>
                </Link>
                <Link href="/contacts?line=life_insurance" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">Contacts</Button>
                </Link>
                <Link href="/sequences?line=life_insurance" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">Sequences</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Combined activity feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Link href="/contacts" className="text-xs text-primary hover:underline">View all contacts</Link>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p className="text-2xl mb-2">🤖</p>
                <p>No activity yet — AI starts working after you enroll contacts in a sequence.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-1.5 text-sm border-b last:border-0">
                    <span className="text-base leading-none mt-0.5">{LINE_ACTIVITY_ICONS[a.type] ?? "•"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cross-sell reminder */}
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">💡 Cross-sell opportunity</p>
          <p>Every real estate client is a potential insurance client. New homeowners especially — they just took on a mortgage and need protection coverage. Flag them with <code className="text-xs bg-muted px-1 py-0.5 rounded">businessLine = life_insurance</code> to add to an insurance sequence too.</p>
        </div>
      </div>
    </div>
  );
}
