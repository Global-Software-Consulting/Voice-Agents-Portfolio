# GSoft AI Voice Agent Portfolio

One Next.js app serving **6 AI Voice Agent demos** (each on its own subdomain), a public
hub, and a shared admin dashboard — backed by one Supabase database.

- **Architecture & build plan:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Working conventions:** [`CLAUDE.md`](CLAUDE.md)

## Core idea

`subdomain → tenant config → everything`. Adding a demo means adding one config file in
`lib/tenants/` + one row in the `tenants` table — no new pages, no new tables.

## Demos

`nestriq` · `callora` · `medelynx` · `lexora` · `qualivo` · `voxium`
Hub: `voice.gsoftconsulting.com` · Dashboard: `admin.voice.gsoftconsulting.com`

## Status

First demo (Nestriq / ElevenLabs) is wired end-to-end: subdomain routing, shared API +
adapter layer, function/webhook endpoints, demo landing page, and admin dashboard all build
and run. Connect Supabase + an ElevenLabs agent to go live; see `.env.example`.

## Run locally

```bash
cp .env.example .env.local   # fill in Supabase + ElevenLabs values
npm run dev                  # http://localhost:3000 (hub)
```

Exercise subdomains via `*.lvh.me`: `http://nestriq.lvh.me:3000`, `http://admin.lvh.me:3000`.

## Database

Apply `supabase/migrations/0001_init.sql` to your Supabase project (SQL editor or CLI).
