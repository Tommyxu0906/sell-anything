# sellAnything — AI Sales Agent SaaS

## Project overview
Multi-tenant B2B sales automation SaaS. Automates the full outbound sales workflow:
prospecting → AI-personalized cold email → sequence cadence → reply classification → human-reviewed responses → calendar booking.

## Stack
- **Framework**: Next.js 15 App Router (TypeScript)
- **DB**: Supabase Postgres + Drizzle ORM (`lib/db/schema.ts`)
- **Auth**: Supabase Auth (email + Google OAuth)
- **Background jobs**: Inngest (`lib/inngest/`)
- **LLM**: Vercel AI SDK + `@ai-sdk/anthropic` — Sonnet 4.6 for drafting, Haiku 4.5 for classification, Opus 4.7 for hard replies
- **Email out**: Resend (`lib/integrations/resend.ts`) — CAN-SPAM footer auto-appended
- **Email in**: Postmark inbound webhook (`app/api/webhooks/postmark/`)
- **Billing**: Stripe (`app/api/webhooks/stripe/`)

## Multi-tenancy
Every DB table has `org_id`. RLS policies live in `supabase/migrations/`. Never query without filtering by `orgId`. Use `requireOrg()` from `lib/auth/current-org.ts` in server components/actions.

## Autonomy levels (L0–L5)
Stored per-module in `organizations.autonomy_settings`. Before any outbound action, check the org's autonomy setting for that module. L0/L1 = queue for human review; L2+ = auto-send.

## Compliance — non-negotiable
- `checkCompliance()` in `lib/compliance/dnc.ts` must be called before EVERY outbound message
- `addToSuppressionList()` must fire on ANY unsubscribe signal
- Every email gets CAN-SPAM footer (handled in `lib/integrations/resend.ts`)
- SMS is default OFF — needs explicit org opt-in

## Dev setup
```bash
cp .env.example .env.local
# Fill in Supabase, Anthropic, Resend, Stripe keys
pnpm install
pnpm dev          # Next.js on :3000
pnpm inngest:dev  # Inngest dev server on :8288
```

## Key commands
```bash
pnpm db:generate   # generate Drizzle migrations
pnpm db:push       # push schema to Supabase
pnpm db:studio     # open Drizzle Studio
```
