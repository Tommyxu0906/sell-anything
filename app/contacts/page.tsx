import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { contacts } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { UserPlus, Upload, Phone } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-yellow-100 text-yellow-700",
  interested: "bg-green-100 text-green-700",
  meeting_booked: "bg-purple-100 text-purple-700",
  qualified: "bg-indigo-100 text-indigo-700",
  closed_won: "bg-emerald-100 text-emerald-700",
  closed_lost: "bg-red-100 text-red-700",
  unsubscribed: "bg-red-50 text-red-400",
  dnc: "bg-gray-50 text-gray-400",
};

export default async function ContactsPage() {
  let rows: (typeof contacts.$inferSelect)[] = [];

  try {
    const org = await requireOrg();
    rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.orgId, org.id))
      .orderBy(desc(contacts.createdAt))
      .limit(100);
  } catch {
    // DB not connected
  }

  return (
    <div>
      <Header title="Contacts" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{rows.length} contacts</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add contact
            </Button>
          </div>
        </div>

        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Stage</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Score</th>
                <th className="px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No contacts yet. AI is prospecting leads based on your ICP.
                  </td>
                </tr>
              ) : (
                rows.map((contact) => (
                  <tr key={contact.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${contact.id}`} className="font-medium hover:text-primary">
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.jobTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[contact.stage ?? "new"]}`}>
                        {(contact.stage ?? "new").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {contact.icpScore != null && (
                        <Badge variant={contact.icpScore >= 70 ? "default" : "secondary"}>
                          {contact.icpScore}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/call-prep/${contact.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Phone className="h-3.5 w-3.5" /> Prep Call
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
