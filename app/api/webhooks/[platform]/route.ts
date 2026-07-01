// Call / transcript webhook endpoint. Voice vendors POST call lifecycle + transcript
// data here:  /api/webhooks/<platform>?tenant=<slug>
//
// Flow: adapter normalizes -> ensure tenant + call -> save transcript/summary,
// close the call, log an agent event.

import { getAdapter } from "@/lib/adapters";
import { verifyElevenLabsSignature } from "@/lib/adapters/elevenlabs";
import { verifyHumeSignature, fetchHumeTranscript } from "@/lib/adapters/hume";
import { verifyVapiSecret } from "@/lib/adapters/vapi";
import { ensureTenant } from "@/lib/api/tenants";
import { ensureCall, closeCall } from "@/lib/api/calls";
import { saveTranscript } from "@/lib/api/transcripts";
import { logAgentEvent, logFunctionCall } from "@/lib/api/events";
import { runFunction } from "@/lib/functions/handlers";
import { summarizeTranscript } from "@/lib/llm/summarize";

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

    if (platform === "hume") {
      const secret = process.env.HUME_WEBHOOK_SECRET;
      if (secret) {
        const sig = req.headers.get("x-hume-ai-webhook-signature") ?? "";
        const ts = req.headers.get("x-hume-ai-webhook-timestamp") ?? "";
        if (!verifyHumeSignature(raw, sig, ts, secret)) {
          return Response.json({ error: "invalid signature" }, { status: 401 });
        }
      }
    }

    if (platform === "vapi") {
      const secret = process.env.VAPI_SECRET;
      if (secret) {
        const got = req.headers.get("x-vapi-secret") ?? "";
        if (!verifyVapiSecret(got, secret)) {
          return Response.json({ error: "invalid secret" }, { status: 401 });
        }
      }
    }

    let body: unknown = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    // Vapi delivers tool calls to the same Server URL as call events. Execute
    // them here and return Vapi's expected `{ results: [...] }` shape instead of
    // treating them as a (transcript) webhook.
    if (platform === "vapi") {
      const mt = (body as { message?: { type?: string } }).message?.type;
      if (mt === "tool-calls" || mt === "function-call") {
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
        return Response.json(
          adapter.formatFunctionResult
            ? adapter.formatFunctionResult(call, result)
            : { ok: true, result },
        );
      }
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

    // Hume's webhook is metadata-only; on chat end, fetch the transcript from its
    // API so the same call row (keyed by chat_id) gets the conversation text.
    if (
      platform === "hume" &&
      event.type === "summary" &&
      event.externalCallId &&
      !event.transcript
    ) {
      const fetched = await fetchHumeTranscript(event.externalCallId);
      if (fetched) {
        event.transcript = fetched.transcript;
        event.summary = event.summary ?? fetched.summary;
      }
    }

    // Generate a consistent summary from the transcript via GPT (works for every
    // platform, including Hume which provides none). Falls back to the
    // platform-provided summary when OPENAI_API_KEY is unset.
    if (event.transcript) {
      const llmSummary = await summarizeTranscript(event.transcript);
      if (llmSummary) event.summary = llmSummary;
    }

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
