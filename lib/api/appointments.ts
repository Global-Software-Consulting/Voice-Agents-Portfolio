// Shared, vendor-agnostic appointment operations.

import { getServiceClient } from "../supabase/server";

export async function bookAppointment(
  tenantId: string,
  leadId: string | null,
  fields: { date?: string; time?: string; status?: string },
): Promise<string> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      date: fields.date ?? null,
      time: fields.time ?? null,
      status: fields.status ?? "booked",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
