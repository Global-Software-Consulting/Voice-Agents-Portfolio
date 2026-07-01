// Vapi adapter (Callora). Vapi's server-side tools POST a "tool-calls" message to
// each tool's configured server URL; we run the function and return Vapi's
// expected `{ results: [{ toolCallId, result }] }` shape. Call lifecycle +
// transcript arrive via the assistant's serverUrl as an "end-of-call-report".
//
// Convention (set in the Vapi dashboard):
//   tool server URL → /api/functions/vapi?tenant=callora&fn=<functionName>
//   assistant serverUrl → /api/webhooks/vapi?tenant=callora
//
// NOTE: exact field paths can vary by Vapi version; parsed defensively.

import type {
  AdapterInput,
  NormalizedCallEvent,
  NormalizedFunctionCall,
  PlatformAdapter,
} from "./types";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// Vapi authenticates server messages with a shared secret in the `x-vapi-secret`
// header (the value you set on the assistant's server config). Constant-time-ish
// compare against VAPI_SECRET when configured.
export function verifyVapiSecret(headerSecret: string, secret: string): boolean {
  if (!headerSecret || !secret) return false;
  if (headerSecret.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= headerSecret.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

export const vapiAdapter: PlatformAdapter = {
  platform: "vapi",

  parseFunctionCall({ body, query }: AdapterInput): NormalizedFunctionCall {
    const root = asRecord(body);
    const m = asRecord(root.message);
    const tenant = query.get("tenant") ?? String(root.tenant ?? "");

    // Newer: message.toolCalls[].function ; older: message.functionCall
    const toolCalls = Array.isArray(m.toolCalls) ? m.toolCalls : [];
    const first = asRecord(toolCalls[0]);
    const fn = asRecord(first.function);
    const legacy = asRecord(m.functionCall);

    const functionName =
      query.get("fn") ?? String(fn.name ?? legacy.name ?? "");

    let rawArgs: unknown = fn.arguments ?? legacy.parameters ?? legacy.arguments ?? {};
    if (typeof rawArgs === "string") {
      try {
        rawArgs = JSON.parse(rawArgs);
      } catch {
        rawArgs = {};
      }
    }

    const callObj = asRecord(m.call);
    const externalCallId = (callObj.id as string) ?? null;
    const toolCallId = (first.id as string) ?? (legacy.id as string) ?? undefined;

    return {
      tenant,
      platform: "vapi",
      externalCallId,
      functionName,
      args: asRecord(rawArgs),
      toolCallId,
    };
  },

  // Vapi reads this HTTP response and hands `result` back to the assistant.
  formatFunctionResult(call: NormalizedFunctionCall, result: unknown) {
    return {
      results: [
        {
          toolCallId: call.toolCallId ?? "",
          result: typeof result === "string" ? result : JSON.stringify(result ?? {}),
        },
      ],
    };
  },

  parseWebhook({ body, query }: AdapterInput): NormalizedCallEvent {
    const root = asRecord(body);
    const m = asRecord(root.message);
    const tenant = query.get("tenant") ?? String(root.tenant ?? "");
    const callObj = asRecord(m.call);
    const externalCallId = (callObj.id as string) ?? null;
    const mtype = String(m.type ?? "");

    // Transcript + summary live on the end-of-call-report (in `artifact`/`analysis`).
    const artifact = asRecord(m.artifact);
    const analysis = asRecord(m.analysis);
    const transcript =
      (m.transcript as string) ?? (artifact.transcript as string) ?? undefined;
    const summary =
      (m.summary as string) ?? (analysis.summary as string) ?? undefined;

    const durationSeconds =
      numOrUndef(m.durationSeconds) ??
      numOrUndef(m.duration) ??
      numOrUndef(asRecord(m.durationMs).valueOf?.());

    const type: NormalizedCallEvent["type"] =
      mtype === "end-of-call-report"
        ? "summary"
        : mtype === "status-update" && String(m.status ?? "") === "ended"
          ? "call.ended"
          : "transcript";

    return {
      tenant,
      platform: "vapi",
      externalCallId,
      type,
      transcript: transcript || undefined,
      summary: summary || undefined,
      durationSeconds,
    };
  },
};
