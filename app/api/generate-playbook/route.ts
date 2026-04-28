import { NextRequest, NextResponse } from "next/server";
import { generatePlaybook } from "@/lib/ai/generate-playbook";
import { getPresetById } from "@/lib/data/industry-presets";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description, industryPresetId, orgName } = await req.json();

  if (!description || description.trim().length < 10) {
    return NextResponse.json({ error: "Description too short" }, { status: 400 });
  }

  const preset = industryPresetId ? getPresetById(industryPresetId) : undefined;

  const playbook = await generatePlaybook({
    description: description.trim(),
    industryPreset: preset,
    orgName: orgName ?? "your company",
  });

  return NextResponse.json(playbook);
}
