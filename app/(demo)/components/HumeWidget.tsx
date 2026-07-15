// Live Hume EVI (Empathic Voice Interface) widget for Lexora.
//
// Unlike the ElevenLabs embed, Hume runs over a WebSocket via the official React
// SDK. Flow:
//   1. fetch a short-lived access token from /api/voice/hume-token
//   2. connect() opens the EVI socket (SDK handles mic capture + audio playback)
//   3. tool calls arrive via VoiceProvider's onToolCall -> we forward them to our
//      shared endpoint /api/functions/hume and return the result to Hume
//   4. caller emotion (Hume prosody scores) is rolled up and posted as an
//      emotionAnalysis function call so it lands in the dashboard + demo panel
//
// Lazy-loaded (ssr:false) by VoiceWidget so the SDK only ships for Hume tenants.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceProvider, useVoice, type ToolCallHandler } from "@humeai/voice-react";
import { LeadFallbackForm } from "./LeadFallbackForm";

type Props = { tenant: string; configId: string; accent: string };
type InnerProps = Props & {
  chatIdRef: React.MutableRefObject<string>;
  failed: boolean;
  setFailed: (v: boolean) => void;
};

// Pick the strongest emotion from Hume's prosody score map.
function topEmotion(
  scores: Record<string, number>,
): { name: string; score: number } | null {
  let best: { name: string; score: number } | null = null;
  for (const [name, score] of Object.entries(scores)) {
    if (typeof score === "number" && (!best || score > best.score)) {
      best = { name, score };
    }
  }
  return best;
}

// Narrow a socket message to a user prosody-scored message without leaning on the
// SDK's deep union types (which vary by version).
function userProsodyScores(m: unknown): Record<string, number> | null {
  const anyM = m as unknown as {
    type?: string;
    models?: { prosody?: { scores?: Record<string, number> } };
  };
  if (anyM.type === "user_message" && anyM.models?.prosody?.scores) {
    return anyM.models.prosody.scores;
  }
  return null;
}

function Inner({ tenant, configId, accent, chatIdRef, failed, setFailed }: InnerProps) {
  const { connect, disconnect, status, messages, chatMetadata, error, isError } =
    useVoice();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const setError = setErrorMsg;
  const lastEmotion = useRef<string>("");

  // Share the live chat id with the tool-call handler (in the parent) so every
  // event — tool calls, emotion, and the post-call transcript webhook — links to
  // the same call row (keyed by chat_id).
  useEffect(() => {
    if (chatMetadata?.chatId) chatIdRef.current = chatMetadata.chatId;
  }, [chatMetadata, chatIdRef]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/voice/hume-token", { cache: "no-store" });
      if (!res.ok) {
        setError("Voice agent isn't configured yet.");
        return;
      }
      const { accessToken, configId: tokenConfigId } = (await res.json()) as {
        accessToken: string;
        configId?: string;
      };
      await connect({
        auth: { type: "accessToken", value: accessToken },
        configId: tokenConfigId || configId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setFailed(true);
    }
  }, [connect, configId]);

  // Hume reports out-of-credits / quota / socket failures *asynchronously*: the
  // token mint (GET /api/voice/hume-token) still returns 200 and connect()
  // resolves, but the EVI socket is then rejected/closed. Depending on the cause
  // this surfaces as status "error", or as the context `error`/`isError` (the
  // provider's onError also flips `failed` from the parent). Watch all of them
  // and fall back to the callback form.
  useEffect(() => {
    if (status.value === "error" || isError || error) {
      const reason =
        (status.value === "error" && status.reason) ||
        error?.message ||
        "Our voice line is busy right now.";
      setError(reason);
      setFailed(true);
    }
  }, [status, isError, error, setFailed]);

  // Roll up the caller's emotional state as the conversation progresses, posting
  // a new reading only when the dominant emotion changes (avoids spamming rows).
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const scores = userProsodyScores(messages[i]);
      if (!scores) continue;
      const top = topEmotion(scores);
      if (top && top.name !== lastEmotion.current) {
        lastEmotion.current = top.name;
        void fetch(`/api/functions/hume?tenant=${tenant}&fn=emotionAnalysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parameters: { dominantEmotion: top.name, intensity: top.score },
            chat_id: chatMetadata?.chatId ?? "",
          }),
        }).catch(() => {});
      }
      break;
    }
  }, [messages, tenant, chatMetadata]);

  const connected = status.value === "connected";
  const connecting = status.value === "connecting";

  // Couldn't start the call (e.g. out of credits) → show the callback form.
  if (failed) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-[92vw] max-w-sm">
        <LeadFallbackForm
          tenant={tenant}
          accent={accent}
          reason="Our voice line is busy right now."
        />
        <button
          onClick={() => {
            setFailed(false);
            setError(null);
          }}
          className="mt-2 text-xs text-gray-500 underline"
        >
          Try the voice agent again
        </button>
      </div>
    );
  }

  // Float in the bottom-right corner (like the ElevenLabs ConvAI widget) rather
  // than sitting inline in the hero — position:fixed takes it out of flow.
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {connected && (
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-600 shadow-md">
          ● Live — speak now
        </span>
      )}
      {errorMsg && (
        <span className="max-w-[220px] rounded-full bg-white px-3 py-1 text-xs text-rose-600 shadow-md">
          {errorMsg}
        </span>
      )}
      <button
        onClick={connected ? () => void disconnect() : () => void start()}
        disabled={connecting}
        className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 font-medium text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
        style={{ background: accent }}
      >
        {connected ? "■ End conversation" : connecting ? "Connecting…" : "🎤 Talk To Agent"}
      </button>
    </div>
  );
}

export default function HumeWidget({ tenant, configId, accent }: Props) {
  // Holds the live chat id so tool calls link to the same call row as the
  // emotion readings and the post-call transcript. Set by Inner from chatMetadata.
  const chatIdRef = useRef<string>("");

  // Whether the call couldn't start (out of credits / quota / socket rejected).
  // Lifted here because the most reliable failure signal — the provider's
  // onError callback — fires at this level, not inside Inner. A successful call
  // that was connected then cleanly ended (onClose after a real connection) must
  // NOT trip this, so we only treat a close as failure when it happens without
  // the socket ever reaching "connected" (tracked via connectedRef).
  const [failed, setFailed] = useState(false);
  const connectedRef = useRef(false);

  // Tool calls are executed by our shared server pipeline, then the result is
  // returned to Hume so the agent can continue the conversation.
  const handleToolCall: ToolCallHandler = useCallback(
    async (message, send) => {
      try {
        const args = message.parameters ? JSON.parse(message.parameters) : {};
        const res = await fetch(`/api/functions/hume?tenant=${tenant}&fn=${message.name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parameters: args, chat_id: chatIdRef.current }),
        });
        const json = (await res.json()) as { result?: unknown };
        return send.success(json.result ?? { ok: true });
      } catch (e) {
        return send.error({
          error: "tool_failed",
          code: "tool_failed",
          level: "warn",
          content: e instanceof Error ? e.message : "tool execution failed",
        });
      }
    },
    [tenant],
  );

  return (
    <VoiceProvider
      onToolCall={handleToolCall}
      onOpen={() => {
        connectedRef.current = true;
      }}
      onError={(err) => {
        // Out-of-credits / quota / assistant-error: the canonical failure hook.
        console.log("[hume] onError", err);
        setFailed(true);
      }}
      onClose={(e) => {
        // A close *before* a successful open means the socket was rejected
        // (e.g. out of credits) rather than a user-ended call.
        console.log("[hume] onClose", e, "wasConnected=", connectedRef.current);
        if (!connectedRef.current) setFailed(true);
        connectedRef.current = false;
      }}
    >
      <Inner
        tenant={tenant}
        configId={configId}
        accent={accent}
        chatIdRef={chatIdRef}
        failed={failed}
        setFailed={setFailed}
      />
    </VoiceProvider>
  );
}
