-- GSoft AI Voice Agent Portfolio — initial schema.
-- One database, shared tables. Every tenant-scoped row carries tenant_id.
-- See docs/ARCHITECTURE.md.

create extension if not exists "pgcrypto";

-- Source of truth for demos (config can also be served from lib/tenants for speed).
create table tenants (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,          -- 'nestriq' (== agent_type)
  name       text not null,                 -- 'Nestriq AI'
  platform   text not null,                 -- 'elevenlabs' | 'vapi' | ...
  industry   text,
  config     jsonb,                         -- optional cached TenantConfig
  created_at timestamptz not null default now()
);

create table calls (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  agent_type    text not null,              -- denormalized tenant slug, per PDF
  external_id   text,                       -- vendor conversation/call id (for upserts)
  caller_name   text,
  duration      integer,                    -- seconds
  status        text,                       -- 'in_progress' | 'completed' | ...
  started_at    timestamptz not null default now(),
  ended_at      timestamptz
);

-- One call row per vendor conversation id.
create unique index calls_external_id_key on calls (external_id) where external_id is not null;

create table transcripts (
  id         uuid primary key default gen_random_uuid(),
  call_id    uuid not null references calls(id) on delete cascade,
  transcript text,
  summary    text,
  created_at timestamptz not null default now()
);

create table leads (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  agent_type text not null,
  name       text,
  email      text,
  phone      text,
  industry   text,
  score      integer,
  status     text,
  created_at timestamptz not null default now()
);

create table appointments (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  lead_id    uuid references leads(id) on delete set null,
  date       date,
  time       text,
  status     text,
  created_at timestamptz not null default now()
);

create table agent_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  call_id    uuid references calls(id) on delete cascade,
  event_type text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create table function_calls (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  call_id    uuid references calls(id) on delete cascade,
  name       text not null,                 -- normalized function name
  arguments  jsonb,
  result     jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for the dashboard's per-tenant filters.
create index on calls (tenant_id);
create index on leads (tenant_id);
create index on appointments (tenant_id);
create index on agent_events (tenant_id);
create index on function_calls (tenant_id);
create index on transcripts (call_id);

-- Row Level Security: lock everything down. Public demo sites write via the
-- server using the service role (which bypasses RLS). The admin dashboard reads
-- with an authenticated role. No public/anon access by default.
alter table tenants        enable row level security;
alter table calls          enable row level security;
alter table transcripts    enable row level security;
alter table leads          enable row level security;
alter table appointments   enable row level security;
alter table agent_events   enable row level security;
alter table function_calls enable row level security;

-- Example: allow authenticated dashboard users to read everything.
-- (Adjust to your auth model; service role bypasses these.)
create policy "authenticated read" on calls          for select to authenticated using (true);
create policy "authenticated read" on transcripts    for select to authenticated using (true);
create policy "authenticated read" on leads          for select to authenticated using (true);
create policy "authenticated read" on appointments   for select to authenticated using (true);
create policy "authenticated read" on agent_events   for select to authenticated using (true);
create policy "authenticated read" on function_calls for select to authenticated using (true);
create policy "authenticated read" on tenants        for select to authenticated using (true);
