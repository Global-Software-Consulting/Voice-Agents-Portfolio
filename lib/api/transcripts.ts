// Shared, vendor-agnostic transcript operations.

import { getServiceClient } from "../supabase/server";

export async function saveTranscript(
  callId: string,
  fields: { transcript?: string; summary?: string },
): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("transcripts").insert({
    call_id: callId,
    transcript: fields.transcript ?? null,
    summary: fields.summary ?? null,
  });
  if (error) throw error;
}
