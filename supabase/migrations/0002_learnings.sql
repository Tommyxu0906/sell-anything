-- Org Learnings: accumulated style preferences + performance signals
CREATE TABLE IF NOT EXISTS org_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- style | timing | content | subject | performance
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence TEXT DEFAULT '0.5',
  evidence_count INTEGER DEFAULT 1,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_learnings_org_id ON org_learnings(org_id);
CREATE INDEX idx_org_learnings_category ON org_learnings(org_id, category);

-- Draft Edits: before/after capture when human edits AI draft
CREATE TABLE IF NOT EXISTS draft_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  ai_subject TEXT,
  ai_body TEXT,
  user_subject TEXT,
  user_body TEXT,
  diff_insights JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draft_edits_org_id ON draft_edits(org_id);

-- Add learning + customization columns to playbooks
ALTER TABLE playbooks
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS tone TEXT,
  ADD COLUMN IF NOT EXISTS sequence_strategy TEXT,
  ADD COLUMN IF NOT EXISTS icp_score_weights JSONB,
  ADD COLUMN IF NOT EXISTS learning_context TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS generated_from TEXT;

-- Add strategy + tone to sequences
ALTER TABLE sequences
  ADD COLUMN IF NOT EXISTS strategy TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS tone TEXT,
  ADD COLUMN IF NOT EXISTS industry_context TEXT;

-- Add per-contact customization
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS tone_override TEXT,
  ADD COLUMN IF NOT EXISTS approach_override TEXT,
  ADD COLUMN IF NOT EXISTS contact_memory TEXT;

-- Add edit capture + engagement tracking to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS user_edited_subject TEXT,
  ADD COLUMN IF NOT EXISTS user_edited_body TEXT,
  ADD COLUMN IF NOT EXISTS was_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- Language preference per contact (for bilingual/Mandarin AI drafting)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'english';

-- RLS for new tables
ALTER TABLE org_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_learnings_org_isolation" ON org_learnings
  USING (org_id = current_org_id());

CREATE POLICY "draft_edits_org_isolation" ON draft_edits
  USING (org_id = current_org_id());
