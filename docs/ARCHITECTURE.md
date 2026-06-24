# GSoft AI Voice Agent Portfolio — Architecture Blueprint

## Context

GSoft wants **6 live AI Voice Agent demos** that prospects can test themselves, each on its
own subdomain, each feeling like a real product (not a portfolio item). The source spec
(`GSoft AI Voice Agent Portfolio Showcase.pdf`) is explicit on the non-negotiable
constraint: **do NOT build separate applications** — build *one* Next.js codebase, *one*
Supabase database, *one* admin dashboard, *one* shared API layer. Only five things change
per demo: branding, landing-page content, voice platform, agent prompt, and function-call
schema. The goal is that a future demo can be launched in **hours, not days**.

This blueprint defines the repo layout, the multi-tenant database, subdomain routing, the
shared API + per-platform adapter layer, and the dashboard — so the team can execute from a
single agreed structure. No demo code exists yet; this is greenfield.

### The 6 demos (tenants)

| Subdomain | Name | Voice Platform | Industry | Concept |
|---|---|---|---|---|
| nestriq  | Nestriq AI  | ElevenLabs Conversational AI | Real Estate | Seller-acquisition qualifier |
| callora  | Callora AI  | Vapi      | Roofing/HVAC/Plumbing/Home Svc | AI receptionist |
| medelynx | Medelynx AI | Retell AI | Healthcare | AI medical receptionist |
| lexora   | Lexora AI   | Hume AI   | Personal Injury Law | AI legal intake |
| qualivo  | Qualivo AI  | Ultravox  | B2B SaaS / Agency Sales | AI SDR |
| voxium   | Voxium Labs | Deepgram  | Voice Tech Showcase | Transcription / speech-intel lab |

Plus the hub `voice.gsoftconsulting.com` (showcase of all cards) and
`admin.voice.gsoftconsulting.com` (shared dashboard).

---

## Recommended Architecture (decisions)

1. **One Next.js app (App Router) + middleware-based subdomain routing.** One Vercel
   deployment with a wildcard domain. Not a Turborepo — the demos share pages, DB, and
   dashboard; only config differs.
2. **Config-driven multi-tenancy.** Each subdomain maps to a `tenant` config (branding,
   copy, platform, widget settings, prompt, function schema). Adding a demo = add one
   config object + one DB row, no new pages.
3. **One Supabase database, shared tables, `agent_type` discriminator** (as the PDF
   already sketches). Add a `tenants` table; enforce isolation with RLS.
4. **Per-platform adapter layer.** One adapter per voice vendor normalizes its
   webhooks/function-calls into a single internal event shape, then writes to the shared
   tables. The rest of the system never knows which vendor was used.

---

## Repo / Folder Structure

```
gsoft-voice/                      # one repo, one Next.js app
├─ middleware.ts                  # detect subdomain → set tenant, rewrite to route group
├─ app/
│  ├─ (hub)/                      # voice.gsoftconsulting.com — showcase of all demos
│  │  └─ page.tsx                 # cards, each links to a live demo
│  ├─ (demo)/                     # rendered for every tenant subdomain
│  │  ├─ layout.tsx               # pulls tenant config, applies branding/theme
│  │  ├─ page.tsx                 # landing page (industry branding + voice widget)
│  │  └─ components/
│  │     ├─ VoiceWidget.tsx       # "🎤 Talk To Agent" — swaps SDK per tenant.platform
│  │     ├─ SuggestedPrompts.tsx  # tenant.testPrompts
│  │     ├─ LiveTranscript.tsx    # realtime via Supabase Realtime
│  │     ├─ ExtractedDataPanel.tsx# structured data captured by the AI
│  │     └─ FunctionCallLog.tsx   # actions the AI performed
│  ├─ (admin)/                    # admin.voice.gsoftconsulting.com — shared dashboard
│  │  ├─ layout.tsx               # auth-gated
│  │  └─ dashboard/               # Calls, Leads, Appointments, Transcripts,
│  │                              # Analytics, Agent Activity, Function Call Logs
│  └─ api/
│     ├─ webhooks/[platform]/route.ts   # single entry; dispatches to adapter
│     ├─ functions/[platform]/route.ts  # function-call execution endpoint
│     └─ realtime/...                    # transcript streaming helpers
├─ lib/
│  ├─ tenants/
│  │  ├─ registry.ts              # SUBDOMAIN → tenant config map (source of truth)
│  │  ├─ nestriq.ts … voxium.ts   # one config file per demo
│  │  └─ types.ts                 # TenantConfig type
│  ├─ adapters/
│  │  ├─ types.ts                 # NormalizedCallEvent / NormalizedFunctionCall
│  │  ├─ elevenlabs.ts            # nestriq
│  │  ├─ vapi.ts                  # callora
│  │  ├─ retell.ts                # medelynx
│  │  ├─ hume.ts                  # lexora
│  │  ├─ ultravox.ts              # qualivo
│  │  ├─ deepgram.ts              # voxium
│  │  └─ index.ts                 # platform → adapter lookup
│  ├─ api/                        # SHARED API LAYER (the doc's requirement)
│  │  ├─ leads.ts                 # createLead, scoreLead, updateLead
│  │  ├─ calls.ts                 # createCall, closeCall
│  │  ├─ appointments.ts          # bookAppointment, reschedule
│  │  ├─ transcripts.ts           # saveTranscript, saveSummary
│  │  └─ events.ts                # logAgentEvent (function-call audit)
│  ├─ functions/                  # business logic behind each function-call name
│  │  └─ handlers.ts              # createLead, bookAppointment, calcScore, etc.
│  └─ supabase/                   # server + browser clients
├─ supabase/
│  └─ migrations/                 # SQL schema below
└─ package.json                   # all 6 voice SDKs as deps, lazy-loaded per tenant
```

### TenantConfig (the per-demo "only change this" surface)

Mirrors the PDF's "Only change per subdomain" list exactly:

```ts
type TenantConfig = {
  slug: string;                 // 'nestriq' (== agent_type in DB)
  name: string;                 // 'Nestriq AI'
  platform: VoicePlatform;      // 'elevenlabs' | 'vapi' | 'retell' | 'hume' | 'ultravox' | 'deepgram'
  branding: { logo; colors; theme; tagline };   // industry-specific landing/branding
  landing: { hero; features[]; concept };        // landing page content
  testPrompts: string[];        // suggested prompts visitors see
  agentPrompt: string;          // system prompt for the voice agent
  functions: FunctionSchema[];  // function-calling schema (names + params)
  platformConfig: Record<string, string>;        // agentId / assistantId / api keys ref
};
```

---

## Database (one Supabase, shared tables)

Keep the PDF's tables, add `tenants` + `function_calls`, and add an `agent_type` /
`tenant_id` discriminator everywhere so the single dashboard can filter by demo.

```sql
-- source of truth for demos (can also be served from lib/tenants for speed)
tenants        (id, slug, name, platform, industry, config jsonb, created_at)

calls          (id, tenant_id, agent_type, caller_name, duration, status, started_at, ended_at)
transcripts    (id, call_id, transcript, summary, created_at)
leads          (id, tenant_id, agent_type, name, email, phone, industry, score, status, created_at)
appointments   (id, tenant_id, lead_id, date, time, status, created_at)
agent_events   (id, tenant_id, call_id, event_type, payload jsonb, created_at)
function_calls (id, tenant_id, call_id, name, arguments jsonb, result jsonb, created_at)
```

- **Why shared, not per-project tables:** the spec requires *one* admin dashboard showing
  Calls/Leads/Appointments/Transcripts/Analytics across all demos. Shared tables + a
  `tenant_id`/`agent_type` column make every dashboard view a simple filter. Separate
  tables per demo would mean N× the queries, N× migrations, and a fractured dashboard.
- **RLS:** enable row-level security; demo (public) writes go through the server API with
  the service role, never the anon key. Dashboard reads are auth-gated.
- `function_calls` + `agent_events` give the "Function Calling Demonstration" and "Agent
  Activity" panels the PDF asks for.

---

## Request Flow (how one demo runs)

1. Visitor opens `nestriq.voice.gsoftconsulting.com`.
2. `middleware.ts` extracts `nestriq`, attaches the tenant, rewrites to `(demo)`.
3. `(demo)/layout.tsx` loads `registry['nestriq']` → applies branding + suggested prompts.
4. `VoiceWidget` lazy-loads the **ElevenLabs** SDK (per `tenant.platform`) and starts a call.
5. The voice vendor calls our **function endpoint** `/api/functions/elevenlabs` (e.g.
   `Create Lead`, `Calculate Motivation Score`, `Book Consultation`).
6. The **adapter** normalizes the payload → calls the **shared API** (`lib/api/*`) → writes
   to shared tables → logs to `function_calls` / `agent_events`.
7. Call/transcript webhooks hit `/api/webhooks/elevenlabs` → adapter → `transcripts`.
8. UI panels (Live Transcript, Extracted Data, Function Call Log) update via **Supabase
   Realtime**; the same rows surface in the **admin dashboard** instantly.

Every other demo is identical except step 4–7's `platform` string and the tenant's function
schema — which is the entire point.

---

## Build Sequence (suggested order, post-approval)

1. Scaffold Next.js (App Router) + Tailwind; deploy skeleton to Vercel with wildcard domain.
2. `middleware.ts` subdomain detection + `lib/tenants/registry.ts` with one real tenant
   (Nestriq) and stubs for the rest.
3. Supabase project + migrations for the tables above + RLS policies.
4. Shared API layer (`lib/api/*`) + function handlers (`lib/functions/handlers.ts`).
5. Adapter interface (`lib/adapters/types.ts`) + first adapter (ElevenLabs).
6. `(demo)` pages + VoiceWidget wired end-to-end for **Nestriq** → first fully working demo.
7. Admin dashboard (`(admin)`) reading shared tables, filterable by tenant.
8. Add remaining 5 tenants: one config file + one adapter each (Vapi, Retell, Hume,
   Ultravox, Deepgram). Voxium (Deepgram) is transcription-only — no lead/appointment funcs.
9. Hub page (`voice.gsoftconsulting.com`) with cards linking to each live demo.

---

## Verification

- **Subdomain routing:** locally map `*.lvh.me:3000` (or edit `/etc/hosts`) and confirm each
  subdomain renders its own branding/prompts; `admin.` renders the dashboard.
- **End-to-end per demo:** run a real voice session, then assert rows appear in `calls`,
  `transcripts`, `leads`/`appointments`, `function_calls` with the correct `tenant_id`.
- **Adapter isolation:** replay a captured webhook payload from each vendor against
  `/api/webhooks/[platform]` and confirm identical normalized rows land in the DB.
- **Dashboard:** confirm every panel (Calls, Leads, Appointments, Transcripts, Analytics,
  Agent Activity, Function Call Logs) filters correctly across tenants.
- **"Hours not days" test:** add a 7th dummy tenant via one config file + one row and verify
  a branded landing page + widget appears with zero new pages/components.

---

## Summary answer to the original questions

- **One repo?** Yes — one Next.js app, not 5/6 separate apps.
- **One database?** Yes — one Supabase.
- **Same tables or per-project tables?** **Same shared tables** with a `tenant_id`/
  `agent_type` discriminator — required for the single shared dashboard, and matches the
  PDF's own schema. Per-project tables are the wrong call here.
- **What actually differs per demo?** Only the tenant config: branding, landing copy, voice
  platform (+ its adapter), agent prompt, and function schema.
