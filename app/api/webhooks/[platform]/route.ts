// Call / transcript webhook endpoint. Voice vendors POST call lifecycle + transcript
// data here:  /api/webhooks/<platform>?tenant=<slug>
//
// Flow: adapter normalizes -> ensure tenant + call -> save transcript/summary,
// close the call, log an agent event.

import { getAdapter } from "@/lib/adapters";
import { verifyElevenLabsSignature } from "@/lib/adapters/elevenlabs";
import { ensureTenant } from "@/lib/api/tenants";
import { ensureCall, closeCall } from "@/lib/api/calls";
import { saveTranscript } from "@/lib/api/transcripts";
import { logAgentEvent } from "@/lib/api/events";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  try {
    const { platform } = await params;
    const adapter = getAdapter(platform);
    const url = new URL(req.url);

    // Read the raw body so we can verify the HMAC signature before trusting it.
    const raw = await req.text();

    if (platform === "elevenlabs") {
      const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
      if (secret) {
        const sig = req.headers.get("elevenlabs-signature") ?? "";
        if (!verifyElevenLabsSignature(raw, sig, secret)) {
          return Response.json({ error: "invalid signature" }, { status: 401 });
        }
      }
    }

    let body: unknown = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    const event = adapter.parseWebhook({
      body,
      query: url.searchParams,
      headers: req.headers,
    });

    if (!event.tenant) {
      return Response.json({ error: "missing tenant" }, { status: 400 });
    }

    const tenantId = await ensureTenant(event.tenant);
    const callId = await ensureCall(tenantId, event.tenant, event.externalCallId);

    if (callId && (event.transcript || event.summary)) {
      await saveTranscript(callId, {
        transcript: event.transcript,
        summary: event.summary,
      });
    }

    if (event.externalCallId && (event.type === "call.ended" || event.type === "summary")) {
      await closeCall(event.externalCallId, {
        durationSeconds: event.durationSeconds,
        callerName: event.callerName,
      });
    }

    await logAgentEvent(tenantId, callId, `webhook.${event.type}`, {
      durationSeconds: event.durationSeconds,
    });

    return Response.json({ ok: true });
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
