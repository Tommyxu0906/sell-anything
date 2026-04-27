-- ============================================================
-- sellAnything — Supabase RLS Policies
-- Run after Drizzle push: supabase db push OR supabase migration apply
-- ============================================================

-- Helper: extract org_id from JWT custom claim
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid;
$$;

-- ── organizations ──────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_own_org" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_owners_can_update" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ── org_members ────────────────────────────────────────────
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_see_same_org" ON org_members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- ── org_invitations ────────────────────────────────────────
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_invitations" ON org_invitations
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── playbooks ──────────────────────────────────────────────
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_playbooks" ON playbooks
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ── companies ──────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_companies" ON companies
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ── contacts ───────────────────────────────────────────────
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_contacts" ON contacts
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ── sequences ──────────────────────────────────────────────
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_sequences" ON sequences
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ── sequence_steps ─────────────────────────────────────────
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_sequence_steps" ON sequence_steps
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM sequences WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- ── contact_sequences ──────────────────────────────────────
ALTER TABLE contact_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_contact_sequences" ON contact_sequences
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ── messages ───────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_messages" ON messages
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ── activities ─────────────────────────────────────────────
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_activities" ON activities
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ── suppression_list ───────────────────────────────────────
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_suppression" ON suppression_list
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ── integrations ───────────────────────────────────────────
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_integrations" ON integrations
  FOR ALL USING (
    user_id = auth.uid()
    AND org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- Service-role bypass (for Inngest workers + webhook handlers)
-- These use service role key so RLS is bypassed automatically.
-- Never expose service role key to clients.
