// Hume AI (EVI — Empathic Voice Interface) adapter (Lexora).
//
// Hume's transport differs from ElevenLabs: EVI runs over a WebSocket from the
// browser and emits tool calls + per-utterance emotion scores over that socket.
// The browser widget forwards those to our standard endpoints, so this adapter
// only has to normalize two shapes:
//
//   Function call : the widget POSTs to
//                   /api/functions/hume?tenant=<slug>&fn=<functionName>
//                   with the tool args as the JSON body (same convention as
//                   the ElevenLabs adapter).
//   Webhook       : Hume's chat lifecycle webhook POSTs to
//                   /api/webhooks/hume?tenant=<slug>.
//
// NOTE: exact Hume webhook field names are confirmed during live integration
// (see docs/PLAN-lexora.md §9). The parser below reads the common fields
// defensively and degrades to undefined when a field is absent.

import type {
  AdapterInput,
  NormalizedCallEvent,
  NormalizedFunctionCall,
  PlatformAdapter,
} from "./types";
import { createHmac, timingSafeEqual } from "crypto";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// Verify a Hume webhook signature (https://dev.hume.ai/docs/speech-to-speech-evi/
// configuration/webhooks). Headers: `X-Hume-AI-Webhook-Signature` (hex HMAC-SHA256)
// and `X-Hume-AI-Webhook-Timestamp`. Signed message is `${rawBody}.${timestamp}`,
// using the per-account webhook signing key. Timestamps older than the tolerance
// are rejected (replay protection). Only enforced when HUME_WEBHOOK_SECRET is set.
export function verifyHumeSignature(
  rawBody: string,
  signatureHeader: string,
  timestampHeader: string,
  secret: string,
  toleranceSecs = 180,
): boolean {
  if (!signatureHeader || !timestampHeader) return false;

  // Reject stale timestamps. The header may be unix seconds or milliseconds.
  const tsNum = Number(timestampHeader);
  if (!Number.isFinite(tsNum)) return false;
  const tsSecs = tsNum > 1e12 ? Math.floor(tsNum / 1000) : tsNum;
  const nowSecs = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(nowSecs - tsSecs) > toleranceSecs) return false;

  // HMAC over the raw body + "." + the timestamp header (verbatim string).
  const expected = createHmac("sha256", secret)
    .update(`${rawBody}.${timestampHeader}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

// Hume's webhook delivers only chat metadata (no transcript text). Given a
// chat id, pull the full conversation from Hume's REST API and assemble it into
// a transcript string. Used by the webhook route on chat_ended.
//
// NOTE: confirm the exact field names (events_page / message_text / type values)
// against Hume's API docs during live integration (see docs/PLAN-lexora.md §9).
export async function fetchHumeTranscript(
  chatId: string,
): Promise<{ transcript: string; summary?: string } | null> {
  const apiKey = process.env.HUME_API_KEY;
  if (!apiKey || !chatId) return null;

  const lines: string[] = [];
  const pageSize = 100;
  let page = 0;

  // Bounded loop over paginated chat events (oldest first).
  for (let i = 0; i < 20; i++) {
    const url =
      `https://api.hume.ai/v0/evi/chats/${encodeURIComponent(chatId)}` +
      `?page_number=${page}&page_size=${pageSize}&ascending_order=true`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "X-Hume-Api-Key": apiKey },
        cache: "no-store",
      });
    } catch {
      break;
    }
    if (!res.ok) break;

    const json = (await res.json()) as {
      events_page?: Array<Record<string, unknown>>;
      total_pages?: number;
    };
    const events = Array.isArray(json.events_page) ? json.events_page : [];

    for (const ev of events) {
      const type = String(ev.type ?? "");
      const text = ev.message_text;
      if (
        (type === "USER_MESSAGE" || type === "AGENT_MESSAGE") &&
        typeof text === "string" &&
        text.trim()
      ) {
        lines.push(`${type === "USER_MESSAGE" ? "User" : "Agent"}: ${text.trim()}`);
      }
    }

    const totalPages =
      typeof json.total_pages === "number" ? json.total_pages : page + 1;
    page += 1;
    if (events.length < pageSize || page >= totalPages) break;
  }

  if (lines.length === 0) return null;
  return { transcript: lines.join("\n") };
}

export const humeAdapter: PlatformAdapter = {
  platform: "hume",

  parseFunctionCall({ body, query }: AdapterInput): NormalizedFunctionCall {
    const b = asRecord(body);
    const tenant = query.get("tenant") ?? String(b.tenant ?? "");
    const functionName =
      query.get("fn") ?? String(b.name ?? b.tool_name ?? b.function ?? "");
    // The widget forwards tool args either wrapped or flat; prefer a container.
    const args = asRecord(b.parameters ?? b.args ?? b);
    const externalCallId =
      (b.chat_id as string) ??
      (b.chat_group_id as string) ??
      query.get("chat_id") ??
      null;
    return { tenant, platform: "hume", externalCallId, functionName, args };
  },

  parseWebhook({ body, query }: AdapterInput): NormalizedCallEvent {
    const b = asRecord(body);
    const tenant = query.get("tenant") ?? String(b.tenant ?? "");
    const externalCallId =
      (b.chat_id as string) ?? (b.chat_group_id as string) ?? null;

    // Hume sends a chat lifecycle event; "chat_ended" is our close/summary signal.
    const eventName = String(b.event_name ?? b.type ?? b.event ?? "");
    const type: NormalizedCallEvent["type"] = /end/i.test(eventName)
      ? "summary"
      : "transcript";

    // Transcript may arrive as an array of messages or as a plain string.
    let transcript: string | undefined;
    const rawTranscript = b.transcript ?? b.messages;
    if (Array.isArray(rawTranscript)) {
      transcript =
        rawTranscript
          .map((m) => {
            const r = asRecord(m);
            return `${r.role ?? r.speaker ?? "agent"}: ${r.content ?? r.message ?? r.text ?? ""}`;
          })
          .join("\n") || undefined;
    } else if (typeof rawTranscript === "string") {
      transcript = rawTranscript || undefined;
    }

    const summary =
      (b.summary as string) ?? (asRecord(b.analysis).summary as string) ?? undefined;

    // Hume's chat_ended sends `duration_seconds` directly; fall back to deriving
    // it from start_time/end_time (unix milliseconds) if needed.
    let durationSeconds = numOrUndef(b.duration_seconds ?? b.duration);
    if (durationSeconds == null) {
      const start = numOrUndef(b.start_time ?? b.start_timestamp);
      const end = numOrUndef(b.end_time ?? b.end_timestamp);
      if (start != null && end != null && end >= start) {
        durationSeconds = Math.round((end - start) / 1000);
      }
    }

    return {
      tenant,
      platform: "hume",
      externalCallId,
      type,
      durationSeconds,
      transcript,
      summary,
    };
  },
};
