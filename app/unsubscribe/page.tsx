import { db } from "@/lib/db/client";
import { contacts, suppressionList } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ email?: string; org?: string }>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { email, org: orgId } = await searchParams;

  if (email && orgId) {
    // Process unsubscribe server-side on page load
    await db
      .insert(suppressionList)
      .values({ email, orgId, reason: "unsubscribe" })
      .onConflictDoNothing();

    await db
      .update(contacts)
      .set({ unsubscribed: true, unsubscribedAt: new Date() })
      .where(and(eq(contacts.email, email), eq(contacts.orgId, orgId)));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
        <h1 className="text-2xl font-semibold mb-4">You've been unsubscribed</h1>
        <p className="text-gray-600">
          {email ? (
            <>
              <strong>{email}</strong> has been removed from our mailing list.
              You won't receive any further emails.
            </>
          ) : (
            "Your email has been removed from our mailing list."
          )}
        </p>
      </div>
    </div>
  );
}
