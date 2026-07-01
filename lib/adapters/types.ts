// The single internal shape that every voice vendor is normalized into.
// Each adapter (elevenlabs.ts, vapi.ts, ...) translates the vendor's own request
// into these types so the shared API layer (lib/api/*) stays vendor-agnostic.

import type { VoicePlatform } from "../tenants/types";

// Raw inbound request, handed to an adapter. Vendors put the tenant / call id /
// function name in different places (body, query string, or headers), so we give
// the adapter all three and let it decide.
export type AdapterInput = {
  body: unknown;
  query: URLSearchParams;
  headers: Headers;
};

// A function call the AI decided to make (e.g. "createLead").
export type NormalizedFunctionCall = {
  tenant: string; // tenant slug, e.g. "nestriq"
  platform: VoicePlatform;
  externalCallId: string | null; // vendor's conversation/call id, if present
  functionName: string; // normalized, e.g. "createLead"
  args: Record<string, unknown>;
  toolCallId?: string; // vendor's tool-call id (Vapi needs it to correlate the result)
};

// A call / transcript lifecycle event from a webhook.
export type NormalizedCallEvent = {
  tenant: string;
  platform: VoicePlatform;
  externalCallId: string | null;
  type: "call.started" | "call.ended" | "transcript" | "summary";
  callerName?: string;
  durationSeconds?: number;
  transcript?: string;
  summary?: string;
};

// Every adapter implements this interface.
export interface PlatformAdapter {
  platform: VoicePlatform;
  parseFunctionCall(input: AdapterInput): NormalizedFunctionCall;
  parseWebhook(input: AdapterInput): NormalizedCallEvent;
  // Optional: format the function result into the vendor's expected HTTP response
  // shape (e.g. Vapi wants `{ results: [{ toolCallId, result }] }`). Defaults to
  // `{ ok: true, result }` when not implemented.
  formatFunctionResult?(call: NormalizedFunctionCall, result: unknown): unknown;
}
