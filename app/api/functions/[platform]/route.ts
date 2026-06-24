// Function-call execution endpoint. Voice vendors are configured to POST here when
// the AI invokes a tool:  /api/functions/<platform>?tenant=<slug>&fn=<functionName>
//
// Flow: adapter normalizes -> ensure tenant + call -> run handler -> log -> respond.

import { getAdapter } from "@/lib/adapters";
import { ensureTenant } from "@/lib/api/tenants";
import { ensureCall } from "@/lib/api/calls";
import { logFunctionCall } from "@/lib/api/events";
import { runFunction } from "@/lib/functions/handlers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  try {
    const { platform } = await params;
    const adapter = getAdapter(platform);
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    const call = adapter.parseFunctionCall({
      body,
      query: url.searchParams,
      headers: req.headers,
    });

    if (!call.tenant) {
      return Response.json({ error: "missing tenant" }, { status: 400 });
    }

    const tenantId = await ensureTenant(call.tenant);
    const callId = await ensureCall(tenantId, call.tenant, call.externalCallId);
    const result = await runFunction(call.functionName, call.args, {
      slug: call.tenant,
      tenantId,
      callId,
    });

    await logFunctionCall(tenantId, callId, call.functionName, call.args, result);
    return Response.json({ ok: true, result });
  } catch (err) {
    return Response.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return JSON.stringify(err);
}
