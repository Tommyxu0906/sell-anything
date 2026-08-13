-- Personal voice profile — injected into every email draft, reply, and call script
-- so the AI writes/speaks like the actual person, not like generic AI.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS voice_profile TEXT,
  ADD COLUMN IF NOT EXISTS signature_name TEXT;
