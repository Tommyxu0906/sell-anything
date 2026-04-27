import { db } from "@/lib/db/client";
import { suppressionList } from "@/lib/db/schema";

export async function addToSuppressionList({
  email,
  orgId,
  reason,
}: {
  email: string;
  orgId: string;
  reason: "unsubscribe" | "bounce" | "complaint" | "manual";
}) {
  await db
    .insert(suppressionList)
    .values({ email, orgId, reason })
    .onConflictDoNothing();
}
