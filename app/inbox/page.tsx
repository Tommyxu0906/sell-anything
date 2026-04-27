import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { messages, contacts } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, and, desc } from "drizzle-orm";
import { approveAndSend, rejectDraft } from "@/lib/actions/inbox";
import { CheckCheck, X, MessageSquare, Mail } from "lucide-react";

const CLASSIFICATION_COLORS: Record<string, string> = {
  interested: "bg-green-100 text-green-700",
  objection: "bg-yellow-100 text-yellow-700",
  ooo: "bg-gray-100 text-gray-600",
  book: "bg-purple-100 text-purple-700",
  referral: "bg-blue-100 text-blue-700",
  other: "bg-gray-100 text-gray-600",
};

export default async function InboxPage() {
  let pending: Array<{
    msg: typeof messages.$inferSelect;
    contact: typeof contacts.$inferSelect | null;
  }> = [];

  try {
    const org = await requireOrg();
    const rows = await db
      .select({ msg: messages, contact: contacts })
      .from(messages)
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .where(and(eq(messages.orgId, org.id), eq(messages.reviewStatus, "pending")))
      .orderBy(desc(messages.createdAt))
      .limit(50);
    pending = rows.map((r) => ({ msg: r.msg, contact: r.contact }));
  } catch {
    // DB not connected
  }

  if (pending.length === 0) {
    return (
      <div>
        <Header title={`Inbox`} />
        <div className="flex flex-col items-center justify-center p-20 text-center text-muted-foreground">
          <MessageSquare className="mb-4 h-12 w-12 opacity-30" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm">No drafts waiting for review.</p>
        </div>
      </div>
    );
  }

  const outboundDrafts = pending.filter((p) => p.msg.direction === "outbound");
  const replyDrafts = pending.filter((p) => p.msg.direction === "inbound" && p.msg.aiDraftReply);

  return (
    <div>
      <Header title={`Inbox (${pending.length})`} />
      <div className="p-6 space-y-6">
        {/* Outbound email drafts awaiting approval */}
        {outboundDrafts.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Outbound drafts — {outboundDrafts.length}</h2>
            </div>
            <div className="space-y-3">
              {outboundDrafts.map(({ msg, contact }) => (
                <Card key={msg.id} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{msg.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        To: {contact?.firstName} {contact?.lastName} · {msg.toEmail}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <form action={rejectDraft.bind(null, msg.id)}>
                        <Button variant="ghost" size="sm" type="submit" className="text-destructive hover:text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </form>
                      <form action={approveAndSend.bind(null, msg.id)}>
                        <Button size="sm" type="submit" className="gap-2">
                          <CheckCheck className="h-4 w-4" />
                          Send
                        </Button>
                      </form>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-relaxed">
                      {msg.body}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Reply drafts */}
        {replyDrafts.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Reply drafts — {replyDrafts.length}</h2>
            </div>
            <div className="space-y-3">
              {replyDrafts.map(({ msg, contact }) => (
                <Card key={msg.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate font-medium">
                            {contact?.firstName} {contact?.lastName} replied
                          </p>
                          {msg.replyClassification && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_COLORS[msg.replyClassification]}`}>
                              {msg.replyClassification}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">from {msg.fromEmail}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <form action={rejectDraft.bind(null, msg.id)}>
                          <Button variant="ghost" size="sm" type="submit" className="text-destructive hover:text-destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        </form>
                        <form action={approveAndSend.bind(null, msg.id)}>
                          <Button size="sm" type="submit" className="gap-2">
                            <CheckCheck className="h-4 w-4" />
                            Send reply
                          </Button>
                        </form>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Their message</p>
                      <pre className="whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-xs leading-relaxed">
                        {msg.body}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-primary uppercase tracking-wide">AI draft reply</p>
                      <pre className="whitespace-pre-wrap rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed">
                        {msg.aiDraftReply}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
