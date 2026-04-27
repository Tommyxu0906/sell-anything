"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { db } from "@/lib/db/client";
import { organizations, orgMembers, playbooks, sequences, sequenceSteps } from "@/lib/db/schema";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const orgName = formData.get("orgName") as string;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  if (!data.user) redirect("/signup?error=Signup+failed");

  // Create org
  const slug = orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [org] = await db
    .insert(organizations)
    .values({ name: orgName, slug: `${slug}-${Date.now()}` })
    .returning();

  // Add user as owner
  await db.insert(orgMembers).values({
    orgId: org.id,
    userId: data.user.id,
    role: "owner",
  });

  // Create default playbook
  await db.insert(playbooks).values({
    orgId: org.id,
    name: "Default",
    isDefault: true,
    valueProp: "We help companies grow faster.",
    brandVoice: "Professional, concise, and friendly.",
  });

  redirect("/onboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
