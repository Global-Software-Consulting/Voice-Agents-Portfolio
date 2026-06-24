# GSoft AI Voice Agent Portfolio — CLAUDE.md

Guidance for Claude Code (and humans) working in this repo.

## What this is

**One** Next.js app that serves **6 AI Voice Agent demos**, each on its own subdomain, plus
a public hub and a shared admin dashboard. It is deliberately a single codebase / single
database / single dashboard — **never** split into multiple apps. The whole point is that a
new demo can be launched in hours by adding config, not code.

Full architecture: see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Read it before making
structural changes.

## The golden rule

> **Subdomain → tenant config → everything.**
> A request's subdomain is resolved to a `TenantConfig` in middleware. Branding, copy, voice
> platform, agent prompt, and function schema all come from that config. Storage is shared;
> every row is stamped with `tenant_id`.

When adding a demo, you should only ever touch:
1. `branding` / landing content
2. `platform` (which voice vendor)
3. `agentPrompt`
4. `functions` (function-calling schema)

…all inside one new file in `lib/tenants/` + one row in the `tenants` table. If you find
yourself adding new pages or new tables to ship a demo, stop — that's a design smell.

## The 6 demos (tenants)

| Subdomain | Name | Platform | Industry |
|---|---|---|---|
| nestriq  | Nestriq AI  | ElevenLabs | Real Estate |
| callora  | Callora AI  | Vapi       | Roofing / HVAC / Plumbing / Home Services |
| medelynx | Medelynx AI | Retell AI  | Healthcare |
| lexora   | Lexora AI   | Hume AI    | Personal Injury Law |
| qualivo  | Qualivo AI  | Ultravox   | B2B SaaS / Agency Sales |
| voxium   | Voxium Labs | Deepgram   | Voice Tech Showcase (transcription only) |

Hub: `voice.gsoftconsulting.com` · Dashboard: `admin.voice.gsoftconsulting.com`

> Note: **Voxium (Deepgram)** is transcription/speech-intelligence only — it uses
> `calls` + `transcripts` but has no lead/appointment functions.

## Architecture in one breath

```
Browser (subdomain)
  → middleware.ts        resolves TenantConfig (knows platform)
  → VoiceWidget          lazy-loads the vendor SDK for tenant.platform
Voice vendor (ElevenLabs/Vapi/…)
  → POST /api/functions/[platform]   (vendor's own payload format)
  → lib/adapters/[platform].ts       normalizes to ONE internal shape
  → lib/api/*                        SHARED, vendor-agnostic; writes rows
  → Supabase shared tables           every row tagged with tenant_id
Admin dashboard
  → GET reads the shared tables, filtered by tenant_id
```

The **adapter** is the only platform-specific server code. Everything after it is shared.

## Where things live

- `middleware.ts` — subdomain detection + rewrite to the right route group.
- `app/(hub)` — public showcase of all demos.
- `app/(demo)` — the per-tenant landing page + voice widget + live panels (one set of files,
  rendered for every tenant).
- `app/(admin)` — auth-gated dashboard (Calls, Leads, Appointments, Transcripts, Analytics,
  Agent Activity, Function Call Logs).
- `app/api/webhooks/[platform]` — call/transcript webhooks → adapter.
- `app/api/functions/[platform]` — function-call execution → adapter.
- `lib/tenants/` — `TenantConfig` type, the `registry`, one file per demo.
- `lib/adapters/` — one adapter per voice vendor + the normalized event types.
- `lib/api/` — the **shared API layer**; vendor-agnostic DB operations.
- `lib/functions/` — business logic behind each function-call name.
- `supabase/migrations/` — the single schema (shared tables + RLS).

## Database rules

- One Supabase project. Shared tables: `tenants`, `calls`, `transcripts`, `leads`,
  `appointments`, `agent_events`, `function_calls`.
- **Every tenant-scoped row carries `tenant_id`** (and `agent_type` where the PDF specifies).
  Never create per-demo tables.
- Public demo sites never touch the DB directly — they go through the server API, which uses
  the service role and stamps `tenant_id`. RLS protects against cross-tenant reads.

## Conventions

- Next.js App Router + TypeScript + Tailwind CSS; deploy on Vercel (wildcard domain).
- Keep adapters thin: translate payloads only; put business logic in `lib/functions`.
- New voice platform = new file in `lib/adapters/` + entry in `lib/adapters/index.ts`. No
  changes to `lib/api/*`.

## Local dev

- Use `*.lvh.me:3000` (resolves to 127.0.0.1) to exercise subdomains locally, e.g.
  `nestriq.lvh.me:3000`, `admin.lvh.me:3000`.
- Replay captured vendor webhook payloads against `/api/webhooks/[platform]` to test adapters
  without a live call.

## Status

First vertical slice wired end-to-end (Nestriq / ElevenLabs):
- `proxy.ts` subdomain routing → `/site/[tenant]`, `/dashboard`, hub (verified).
- `lib/tenants/nestriq.ts` + `registry.ts` (one real tenant; others still commented).
- Shared API layer (`lib/api/*`), function handlers (`lib/functions/handlers.ts`).
- ElevenLabs adapter + `/api/functions/[platform]` + `/api/webhooks/[platform]`.
- Demo landing page + VoiceWidget + live panels; admin dashboard reading shared tables.
- Supabase schema in `supabase/migrations/0001_init.sql` (not yet applied to a project).

Not yet done: real Supabase project + env (`.env.local`), live ElevenLabs agent id, and
the other 5 tenants/adapters (Vapi, Retell, Hume, Ultravox, Deepgram). The function API
currently runs the whole pipeline and fails only at the DB call until env is set.

> Note: Next 16 uses `proxy.ts` (not `middleware.ts`) for the rewrite layer.
