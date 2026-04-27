import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { sequences, sequenceSteps, contactSequences } from "@/lib/db/schema";
import { requireOrg } from "@/lib/auth/current-org";
import { eq, and, count, desc } from "drizzle-orm";
import Link from "next/link";
import { Mail, Plus } from "lucide-react";

export default async function SequencesPage() {
  let rows: Array<{ seq: typeof sequences.$inferSelect; stepCount: number; enrolled: number }> = [];

  try {
    const org = await requireOrg();
    const seqs = await db
      .select()
      .from(sequences)
      .where(eq(sequences.orgId, org.id))
      .orderBy(desc(sequences.createdAt));

    rows = await Promise.all(
      seqs.map(async (seq) => {
        const [{ stepCount }] = await db
          .select({ stepCount: count() })
          .from(sequenceSteps)
          .where(eq(sequenceSteps.sequenceId, seq.id));
        const [{ enrolled }] = await db
          .select({ enrolled: count() })
          .from(contactSequences)
          .where(and(eq(contactSequences.sequenceId, seq.id), eq(contactSequences.status, "active")));
        return { seq, stepCount, enrolled };
      })
    );
  } catch {
    // DB not connected
  }

  return (
    <div>
      <Header title="Sequences" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{rows.length} sequences</p>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New sequence
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            <Mail className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">No sequences yet</p>
            <p className="text-sm">A default 4-touch sequence is created after onboarding.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map(({ seq, stepCount, enrolled }) => (
              <Link key={seq.id} href={`/sequences/${seq.id}`}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{seq.name}</CardTitle>
                      <Badge variant={seq.isActive ? "default" : "secondary"}>
                        {seq.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex gap-6 text-sm text-muted-foreground">
                    <span>{stepCount} steps</span>
                    <span>{enrolled} enrolled</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
