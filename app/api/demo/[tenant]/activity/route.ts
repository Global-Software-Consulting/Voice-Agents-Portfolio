// Public, read-only feed for the on-page demo panels (Live Transcript, Function
// Calls, Extracted Data). Runs server-side with the service role so we don't have
// to open the tables to the browser's anon key. Scoped to a single tenant.

import { getServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  try {
    const { tenant } = await params;
    const sb = getServiceClient();

    const t = await sb.from("tenants").select("id").eq("slug", tenant).maybeSingle();
    if (t.error) throw t.error;
    if (!t.data) return Response.json({ functionCalls: [], transcript: "", summary: "" });
    const tenantId = t.data.id;

    // Recent function calls (newest first).
    const fc = await sb
      .from("function_calls")
      .select("name, arguments, result, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (fc.error) throw fc.error;

    // Latest transcript for this tenant's most recent call.
    const lastCall = await sb
      .from("calls")
      .select("id")
      .eq("tenant_id", tenantId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastCall.error) throw lastCall.error;

    let transcript = "";
    let summary = "";
    if (lastCall.data) {
      const tr = await sb
        .from("transcripts")
        .select("transcript, summary")
        .eq("call_id", lastCall.data.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tr.error) throw tr.error;
      transcript = tr.data?.transcript ?? "";
      summary = tr.data?.summary ?? "";
    }

    return Response.json({ functionCalls: fc.data ?? [], transcript, summary });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
