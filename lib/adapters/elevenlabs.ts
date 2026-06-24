// ElevenLabs Conversational AI adapter (Nestriq).
//
// Convention: ElevenLabs server "tools" are configured in the ElevenLabs dashboard
// to POST to /api/functions/elevenlabs?tenant=<slug>&fn=<functionName>. The tool's
// parameters arrive as the JSON body. The post-call webhook POSTs to
// /api/webhooks/elevenlabs?tenant=<slug>.

import type {
  AdapterInput,
  NormalizedCallEvent,
  NormalizedFunctionCall,
  PlatformAdapter,
} from "./types";
import { createHmac, timingSafeEqual } from "crypto";
import { getTenantByAgentId } from "../tenants/registry";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

// Verify the ElevenLabs post-call webhook HMAC signature.
// Header format: "t=<unix_ts>,v0=<hex_hmac>"; signed payload is `${t}.${rawBody}`.
export function verifyElevenLabsSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSecs = 1800,
): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = parts["t"];
  const v0 = parts["v0"];
  if (!t || !v0) return false;

  // Reject stale timestamps (replay protection).
  const ts = Number(t);
  if (!Number.isFinite(ts)) return false;
  const nowSecs = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(nowSecs - ts) > toleranceSecs) return false;

  const expected = createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v0);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Resolve tenant from explicit ?tenant, else from the agent id in the payload.
function resolveTenant(
  query: URLSearchParams,
  fromBody: string,
  agentId: string,
): string {
  return (
    query.get("tenant") ?? fromBody ?? getTenantByAgentId(agentId)?.slug ?? ""
  );
}

export const elevenlabsAdapter: PlatformAdapter = {
  platform: "elevenlabs",

  parseFunctionCall({ body, query }: AdapterInput): NormalizedFunctionCall {
    const b = asRecord(body);
    const tenant = resolveTenant(query, b.tenant as string, b.agent_id as string);
    const functionName = query.get("fn") ?? String(b.tool_name ?? b.function ?? "");
    // ElevenLabs may wrap params, or send them flat. Prefer an explicit container.
    const args = asRecord(b.parameters ?? b.args ?? b);
    const externalCallId =
      (b.conversation_id as string) ??
      query.get("conversation_id") ??
      (b.call_id as string) ??
      null;
    return { tenant, platform: "elevenlabs", externalCallId, functionName, args };
  },

  parseWebhook({ body, query }: AdapterInput): NormalizedCallEvent {
    const b = asRecord(body);
    const data = asRecord(b.data);
    const tenant = resolveTenant(
      query,
      b.tenant as string,
      (data.agent_id as string) ?? (b.agent_id as string),
    );
    const externalCallId =
      (data.conversation_id as string) ?? (b.conversation_id as string) ?? null;

    // ElevenLabs post-call payload carries a transcript array + analysis summary.
    const transcriptArr = Array.isArray(data.transcript) ? data.transcript : [];
    const transcript = transcriptArr
      .map((t) => {
        const r = asRecord(t);
        return `${r.role ?? "agent"}: ${r.message ?? r.text ?? ""}`;
      })
      .join("\n");
    const analysis = asRecord(data.analysis);
    const summary = (analysis.transcript_summary as string) ?? undefined;
    const meta = asRecord(data.metadata);
    const durationSeconds = (meta.call_duration_secs as number) ?? undefined;

    const type = b.type === "post_call_transcription" ? "summary" : "transcript";

    return {
      tenant,
      platform: "elevenlabs",
      externalCallId,
      type,
      durationSeconds,
      transcript: transcript || undefined,
      summary,
    };
  },
};
