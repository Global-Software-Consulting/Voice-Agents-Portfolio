// Shared, vendor-agnostic call operations.

import { getServiceClient } from "../supabase/server";

// Get-or-create a call row for a vendor conversation id. Returns the call uuid.
// Uses select-then-insert (not upsert) so it works with the partial unique index
// on external_id, which Postgres can't use for ON CONFLICT inference.
export async function ensureCall(
  tenantId: string,
  agentType: string,
  externalId: string | null,
): Promise<string | null> {
  const sb = getServiceClient();

  if (externalId) {
    const existing = await sb
      .from("calls")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data.id;
  }

  const { data, error } = await sb
    .from("calls")
    .insert({
      tenant_id: tenantId,
      agent_type: agentType,
      external_id: externalId,
      status: "in_progress",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function closeCall(
  externalId: string,
  fields: { durationSeconds?: number; callerName?: string; status?: string },
): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb
    .from("calls")
    .update({
      duration: fields.durationSeconds ?? null,
      caller_name: fields.callerName ?? null,
      status: fields.status ?? "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("external_id", externalId);
  if (error) throw error;
}
