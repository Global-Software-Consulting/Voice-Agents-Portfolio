// Server-side data loader for the admin dashboard. Reads ALL shared tables with
// the service role, stamps every row with its tenant slug, and returns a single
// typed payload the dashboard renders + filters client-side. Degrades gracefully
// when Supabase isn't configured yet (returns connected:false + empty arrays) so
// the dashboard UI is always visible.

import { getServiceClient } from "@/lib/supabase/server";

export type Call = {
  id: string;
  tenant: string;
  caller_name: string | null;
  duration: number | null;
  status: string | null;
  started_at: string;
  ended_at: string | null;
};

export type Lead = {
  id: string;
  tenant: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  score: number | null;
  status: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  tenant: string;
  lead_id: string | null;
  date: string | null;
  time: string | null;
  status: string | null;
  created_at: string;
};

export type Transcript = {
  id: string;
  tenant: string;
  call_id: string | null;
  transcript: string | null;
  summary: string | null;
  created_at: string;
};

export type AgentEvent = {
  id: string;
  tenant: string;
  call_id: string | null;
  event_type: string | null;
  payload: unknown;
  created_at: string;
};

export type FunctionCall = {
  id: string;
  tenant: string;
  call_id: string | null;
  name: string | null;
  arguments: unknown;
  result: unknown;
  created_at: string;
};

export type DashboardData = {
  connected: boolean;
  error?: string;
  calls: Call[];
  leads: Lead[];
  appointments: Appointment[];
  transcripts: Transcript[];
  agentEvents: AgentEvent[];
  functionCalls: FunctionCall[];
};

const ROW_LIMIT = 500;

function emptyData(extra: Partial<DashboardData> = {}): DashboardData {
  return {
    connected: false,
    calls: [],
    leads: [],
    appointments: [],
    transcripts: [],
    agentEvents: [],
    functionCalls: [],
    ...extra,
  };
}

export async function loadDashboardData(): Promise<DashboardData> {
  let sb;
  try {
    sb = getServiceClient();
  } catch (err) {
    return emptyData({ error: errMessage(err) });
  }

  try {
    const [tenants, calls, leads, appointments, transcripts, events, fns] =
      await Promise.all([
        sb.from("tenants").select("id, slug"),
        sb
          .from("calls")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(ROW_LIMIT),
        sb
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(ROW_LIMIT),
        sb
          .from("appointments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(ROW_LIMIT),
        sb
          .from("transcripts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(ROW_LIMIT),
        sb
          .from("agent_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(ROW_LIMIT),
        sb
          .from("function_calls")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(ROW_LIMIT),
      ]);

    const firstError =
      tenants.error ||
      calls.error ||
      leads.error ||
      appointments.error ||
      transcripts.error ||
      events.error ||
      fns.error;
    if (firstError) throw firstError;

    // tenant_id -> slug, and call_id -> slug (transcripts only carry call_id).
    const idToSlug = new Map<string, string>();
    for (const t of tenants.data ?? []) idToSlug.set(t.id, t.slug);

    const slugOf = (tenantId: string | null, agentType?: string | null) =>
      (tenantId && idToSlug.get(tenantId)) || agentType || "unknown";

    const callSlug = new Map<string, string>();
    const rawCalls = calls.data ?? [];
    for (const c of rawCalls)
      callSlug.set(c.id, slugOf(c.tenant_id, c.agent_type));

    return {
      connected: true,
      calls: rawCalls.map((c) => ({
        id: c.id,
        tenant: slugOf(c.tenant_id, c.agent_type),
        caller_name: c.caller_name,
        duration: c.duration,
        status: c.status,
        started_at: c.started_at,
        ended_at: c.ended_at,
      })),
      leads: (leads.data ?? []).map((l) => ({
        id: l.id,
        tenant: slugOf(l.tenant_id, l.agent_type),
        name: l.name,
        email: l.email,
        phone: l.phone,
        industry: l.industry,
        score: l.score,
        status: l.status,
        created_at: l.created_at,
      })),
      appointments: (appointments.data ?? []).map((a) => ({
        id: a.id,
        tenant: slugOf(a.tenant_id),
        lead_id: a.lead_id,
        date: a.date,
        time: a.time,
        status: a.status,
        created_at: a.created_at,
      })),
      transcripts: (transcripts.data ?? []).map((t) => ({
        id: t.id,
        tenant: (t.call_id && callSlug.get(t.call_id)) || "unknown",
        call_id: t.call_id,
        transcript: t.transcript,
        summary: t.summary,
        created_at: t.created_at,
      })),
      agentEvents: (events.data ?? []).map((e) => ({
        id: e.id,
        tenant: slugOf(e.tenant_id),
        call_id: e.call_id,
        event_type: e.event_type,
        payload: e.payload,
        created_at: e.created_at,
      })),
      functionCalls: (fns.data ?? []).map((f) => ({
        id: f.id,
        tenant: slugOf(f.tenant_id),
        call_id: f.call_id,
        name: f.name,
        arguments: f.arguments,
        result: f.result,
        created_at: f.created_at,
      })),
    };
  } catch (err) {
    return emptyData({ error: errMessage(err) });
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : "unknown error";
}
