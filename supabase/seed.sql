-- Dummy data for local/demo use. Safe to run after 0001_init.sql.
-- Paste into the Supabase SQL Editor and Run. Re-running adds more leads.

-- Ensure the nestriq tenant exists, then seed leads/calls/appointments for it.
with t as (
  insert into tenants (slug, name, platform, industry)
  values ('nestriq', 'Nestriq AI', 'elevenlabs', 'Real Estate')
  on conflict (slug) do update set name = excluded.name
  returning id
)
insert into leads (tenant_id, agent_type, name, email, phone, industry, score, status)
select t.id, 'nestriq', v.name, v.email, v.phone, 'Real Estate', v.score, v.status
from t,
(values
  ('John Carter',    'john.carter@example.com',    '555-0101', 88, 'qualified'),
  ('Maria Lopez',    'maria.lopez@example.com',     '555-0102', 72, 'new'),
  ('David Kim',      'david.kim@example.com',       '555-0103', 65, 'qualifying'),
  ('Sarah Johnson',  'sarah.johnson@example.com',   '555-0104', 95, 'qualified'),
  ('Mike Brown',     'mike.brown@example.com',      '555-0105', 40, 'new'),
  ('Emily Davis',    'emily.davis@example.com',     '555-0106', 81, 'qualified'),
  ('Robert Wilson',  'robert.wilson@example.com',   '555-0107', 55, 'qualifying'),
  ('Linda Martinez', 'linda.martinez@example.com',  '555-0108', 30, 'unqualified')
) as v(name, email, phone, score, status);

-- A couple of call rows.
with t as (select id from tenants where slug = 'nestriq')
insert into calls (tenant_id, agent_type, external_id, caller_name, duration, status, ended_at)
select t.id, 'nestriq', v.ext, v.caller, v.dur, 'completed', now()
from t,
(values
  ('seed-call-1', 'John Carter',   182),
  ('seed-call-2', 'Sarah Johnson', 240)
) as v(ext, caller, dur);

-- One appointment linked to the highest-scoring lead.
with t as (select id from tenants where slug = 'nestriq'),
     l as (select id from leads where name = 'Sarah Johnson' order by created_at desc limit 1)
insert into appointments (tenant_id, lead_id, date, time, status)
select t.id, l.id, current_date + 3, '14:00', 'booked'
from t, l;
