// Shared, vendor-agnostic lead operations.

import { getServiceClient } from "../supabase/server";

export type LeadInput = {
  name?: string;
  email?: string;
  phone?: string;
  industry?: string;
  score?: number;
  status?: string;
};

export async function createLead(
  tenantId: string,
  agentType: string,
  input: LeadInput,
): Promise<string> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("leads")
    .insert({
      tenant_id: tenantId,
      agent_type: agentType,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      industry: input.industry ?? null,
      score: input.score ?? null,
      status: input.status ?? "new",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateLead(leadId: string, fields: LeadInput): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("leads").update(fields).eq("id", leadId);
  if (error) throw error;
}
