import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { contacts, messages, activities } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, and, count, desc } from "drizzle-orm";
import { Users, Mail, MessageSquare, Calendar, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

async function getDashboardData(orgId: string) {
  const [
    [{ totalLeads }],
    [{ emailsSent }],
    [{ replies }],
    recentActivity,
    pendingReview,
  ] = await Promise.all([
    db.select({ totalLeads: count() }).from(contacts).where(eq(contacts.orgId, orgId)),
    db
      .select({ emailsSent: count() })
      .from(messages)
      .where(and(eq(messages.orgId, orgId), eq(messages.direction, "outbound"), eq(messages.reviewStatus, "sent"))),
    db
      .select({ replies: count() })
      .from(messages)
      .where(and(eq(messages.orgId, orgId), eq(messages.direction, "inbound"))),
    db
      .select()
      .from(activities)
      .where(eq(activities.orgId, orgId))
      .orderBy(desc(activities.createdAt))
      .limit(10),
    db
      .select({ pending: count() })
      .from(messages)
      .where(and(eq(messages.orgId, orgId), eq(messages.reviewStatus, "pending"))),
  ]);

  return {
    totalLeads,
    emailsSent,
    replies,
    recentActivity,
    pendingReview: pendingReview[0].pending,
  };
}

export default async function DashboardPage() {
  let data = { totalLeads: 0, emailsSent: 0, replies: 0, recentActivity: [] as typeof activities.$inferSelect[], pendingReview: 0 };

  try {
    const org = await requireOrg();
    data = await getDashboardData(org.id);
  } catch {
    // DB not connected — show empty state
  }

  const STATS = [
    { label: "Leads Prospected", value: data.totalLeads, icon: Users, color: "text-blue-500" },
    { label: "Emails Sent", value: data.emailsSent, icon: Mail, color: "text-green-500" },
    { label: "Replies Received", value: data.replies, icon: MessageSquare, color: "text-yellow-500" },
    { label: "Meetings Booked", value: 0, icon: Calendar, color: "text-purple-500" },
  ];

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Agent status banner */}
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Zap className="h-6 w-6 text-primary" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
            </div>
            <div>
              <p className="font-semibold text-sm">AI Agent is running</p>
              <p className="text-xs text-muted-foreground">Prospecting leads and sending outreach automatically</p>
            </div>
          </div>
          {data.pendingReview > 0 && (
            <Link href="/inbox">
              <Button size="sm" variant="outline">
                {data.pendingReview} drafts to review
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1 text-3xl font-bold">{value.toLocaleString()}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity feed */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Link href="/contacts" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Zap className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p>No activity yet. AI is getting started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{a.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/inbox">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Review AI drafts
                  {data.pendingReview > 0 && (
                    <Badge className="ml-auto" variant="default">{data.pendingReview}</Badge>
                  )}
                </Button>
              </Link>
              <Link href="/contacts">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" />
                  View all contacts
                </Button>
              </Link>
              <Link href="/sequences">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Mail className="h-4 w-4" />
                  Manage sequences
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Zap className="h-4 w-4" />
                  Adjust AI autonomy
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
