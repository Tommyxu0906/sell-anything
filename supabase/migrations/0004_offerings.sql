-- ─── Offering-centric model: intake → research → channel strategy ─────────────
-- Pivots the app from a personal RE/insurance tool to a generic "sell anything"
-- strategy engine. Adds offerings + the market-research/strategy pipeline tables,
-- and links contacts/sequences/messages/playbooks to an offering.

-- Enums (guarded — Postgres has no CREATE TYPE IF NOT EXISTS)
DO $$ BEGIN
  CREATE TYPE channel AS ENUM (
    'outbound_email','cold_call','seo_content','paid_search',
    'social_organic','social_paid','referral','local_presence'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE research_status AS ENUM (
    'queued','planning','gathering','extracting','scoring','synthesizing','done','failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audience_type AS ENUM ('b2b','b2c','local','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE price_band AS ENUM ('low','mid','high','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offering_status AS ENUM ('draft','researching','ready','active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Offerings
CREATE TABLE IF NOT EXISTS offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT,
  category TEXT,
  audience_type audience_type DEFAULT 'b2b',
  price_model TEXT,
  price_band price_band,
  avg_deal_value INTEGER,
  sales_cycle TEXT,
  geo_scope TEXT,
  status offering_status DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS offerings_org_id_idx ON offerings(org_id);

-- Market research runs
CREATE TABLE IF NOT EXISTS market_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  status research_status DEFAULT 'queued',
  plan JSONB,
  findings JSONB,
  summary TEXT,
  confidence TEXT,
  sources JSONB,
  model TEXT,
  tokens_used INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS market_research_org_id_idx ON market_research(org_id);
CREATE INDEX IF NOT EXISTS market_research_offering_idx ON market_research(offering_id);

-- Research signals (auditable spine)
CREATE TABLE IF NOT EXISTS research_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  research_id UUID NOT NULL REFERENCES market_research(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_type TEXT NOT NULL,
  channel channel,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  weight TEXT,
  confidence TEXT,
  raw_excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS research_signals_offering_idx ON research_signals(offering_id);
CREATE INDEX IF NOT EXISTS research_signals_research_idx ON research_signals(research_id);
CREATE INDEX IF NOT EXISTS research_signals_channel_idx ON research_signals(channel);

-- Channel strategies (scoring model output + synthesis)
CREATE TABLE IF NOT EXISTS channel_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  research_id UUID REFERENCES market_research(id) ON DELETE SET NULL,
  scores JSONB NOT NULL,
  recommended TEXT[],
  playbook_by_channel JSONB,
  narrative TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS channel_strategies_offering_idx ON channel_strategies(offering_id);

-- Link existing tables to offerings (nullable during migration; businessLine kept until UI is off it)
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS offering_id UUID REFERENCES offerings(id) ON DELETE CASCADE;
ALTER TABLE contacts  ADD COLUMN IF NOT EXISTS offering_id UUID REFERENCES offerings(id) ON DELETE SET NULL;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS offering_id UUID REFERENCES offerings(id) ON DELETE SET NULL;
ALTER TABLE messages  ADD COLUMN IF NOT EXISTS offering_id UUID REFERENCES offerings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contacts_offering_idx  ON contacts(offering_id);
CREATE INDEX IF NOT EXISTS sequences_offering_idx ON sequences(offering_id);

-- RLS
ALTER TABLE offerings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_research    ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_signals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offerings_org_isolation"          ON offerings          USING (org_id = current_org_id());
CREATE POLICY "market_research_org_isolation"    ON market_research    USING (org_id = current_org_id());
CREATE POLICY "research_signals_org_isolation"   ON research_signals   USING (org_id = current_org_id());
CREATE POLICY "channel_strategies_org_isolation" ON channel_strategies USING (org_id = current_org_id());
