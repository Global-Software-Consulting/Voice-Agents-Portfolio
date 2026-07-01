// Live Vapi voice widget for Callora. Uses @vapi-ai/web: new Vapi(publicKey),
// then start(assistantId). Tool calls + transcript are handled server-side (Vapi
// posts to /api/functions/vapi and /api/webhooks/vapi), so the widget is just the
// call UI. Falls back to the callback form if a call can't start (e.g. no credits).
//
// Lazy-loaded (ssr:false) by VoiceWidget so the SDK only ships for Vapi tenants.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { LeadFallbackForm } from "./LeadFallbackForm";

type Props = { tenant: string; assistantId: string; accent: string };

export default function VapiWidget({ tenant, assistantId, accent }: Props) {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "live">("idle");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!key) return;
    const v = new Vapi(key);
    vapiRef.current = v;
    v.on("call-start", () => setStatus("live"));
    v.on("call-end", () => setStatus("idle"));
    v.on("error", () => {
      setFailed(true);
      setStatus("idle");
    });
    return () => {
      void v.stop();
      vapiRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    setFailed(false);
    setStatus("connecting");
    try {
      await vapiRef.current?.start(assistantId);
    } catch {
      setFailed(true);
      setStatus("idle");
    }
  }, [assistantId]);

  const stop = useCallback(() => {
    void vapiRef.current?.stop();
  }, []);

  if (failed) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-[92vw] max-w-sm">
        <LeadFallbackForm
          tenant={tenant}
          accent={accent}
          reason="Our voice line is busy right now."
        />
        <button
          onClick={() => setFailed(false)}
          className="mt-2 text-xs text-gray-500 underline"
        >
          Try the voice agent again
        </button>
      </div>
    );
  }

  const live = status === "live";
  const connecting = status === "connecting";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {live && (
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-600 shadow-md">
          ● Live — speak now
        </span>
      )}
      <button
        onClick={live ? stop : () => void start()}
        disabled={connecting}
        className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 font-medium text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
        style={{ background: accent }}
      >
        {live ? "■ End call" : connecting ? "Connecting…" : "🎤 Talk To Agent"}
      </button>
    </div>
  );
}
