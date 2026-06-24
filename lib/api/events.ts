// Shared, vendor-agnostic audit logging: agent events + function-call log.
// These feed the dashboard's "Agent Activity" and "Function Call Logs" panels.

import { getServiceClient } from "../supabase/server";

export async function logAgentEvent(
  tenantId: string,
  callId: string | null,
  eventType: string,
  payload: unknown,
): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("agent_events").insert({
    tenant_id: tenantId,
    call_id: callId,
    event_type: eventType,
    payload: payload ?? null,
  });
  if (error) throw error;
}

export async function logFunctionCall(
  tenantId: string,
  callId: string | null,
  name: string,
  args: unknown,
  result: unknown,
): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("function_calls").insert({
    tenant_id: tenantId,
    call_id: callId,
    name,
    arguments: args ?? null,
    result: result ?? null,
  });
  if (error) throw error;
}
