// "Talk To Agent" widget. For ElevenLabs we embed the official ConvAI widget
// (loads the vendor SDK on demand). For Hume we lazy-load the EVI React SDK via
// HumeWidget. Other platforms get their own branch here as they're added.
// Degrades to a clear hint when no agent id is configured.
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LeadFallbackForm } from "./LeadFallbackForm";

// Lazy + client-only so each vendor SDK only ships for its own tenant / never SSR.
const HumeWidget = dynamic(() => import("./HumeWidget"), { ssr: false });
const VapiWidget = dynamic(() => import("./VapiWidget"), { ssr: false });

type Props = {
  agentId: string;
  platform: string;
  accent: string;
  tenant: string;
};

export function VoiceWidget({ agentId, platform, accent, tenant }: Props) {
  // When the agent can't be used (e.g. out of credits) we show a callback form.
  const [outOfCredits, setOutOfCredits] = useState(false);

  useEffect(() => {
    if (platform !== "elevenlabs" || !agentId) return;
    // Pre-check ElevenLabs credits; if exhausted, show the callback form instead.
    fetch(`/api/voice/credits?platform=elevenlabs`)
      .then((r) => r.json())
      .then((d: { outOfCredits?: boolean }) => {
        if (d.outOfCredits) setOutOfCredits(true);
      })
      .catch(() => {});

    if (document.getElementById("elevenlabs-convai-embed")) return;
    const s = document.createElement("script");
    s.id = "elevenlabs-convai-embed";
    s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    s.async = true;
    s.type = "text/javascript";
    document.body.appendChild(s);
  }, [platform, agentId]);

  // Best-effort white-labeling: hide the widget's "Powered by ElevenLabs" badge
  // if it renders in an open shadow root. The reliable path is the ElevenLabs
  // dashboard (Agent → Widget → disable branding); this is a fallback.
  useEffect(() => {
    if (platform !== "elevenlabs") return;
    let tries = 0;
    const hide = () => {
      const host = document.querySelector("elevenlabs-convai");
      const root = host?.shadowRoot;
      if (root) {
        root.querySelectorAll<HTMLElement>("a, span, div, p").forEach((el) => {
          const t = (el.textContent ?? "").toLowerCase();
          if (t.includes("powered by") && el.children.length === 0) {
            el.style.display = "none";
          }
        });
      }
    };
    const iv = setInterval(() => {
      hide();
      if (++tries > 40) clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, [platform]);

  if (outOfCredits) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm">
        <LeadFallbackForm
          tenant={tenant}
          accent={accent}
          reason="Our voice line is busy right now."
        />
      </div>
    );
  }

  if (!agentId) {
    // Platform-specific env hint when the demo isn't wired to a live agent yet.
    const envVar =
      platform === "hume"
        ? "NEXT_PUBLIC_HUME_CONFIG_ID"
        : platform === "vapi"
          ? "NEXT_PUBLIC_VAPI_ASSISTANT_ID"
          : "NEXT_PUBLIC_ELEVENLABS_AGENT_ID";
    return (
      <div className="fixed bottom-6 right-6 z-50 max-w-xs rounded-xl border border-dashed border-gray-300 bg-white/90 p-4 text-sm text-gray-500 shadow-lg backdrop-blur">
        🎤 <strong>Talk To Agent</strong> — set <code>{envVar}</code> in{" "}
        <code>.env.local</code> to enable the live voice widget.
      </div>
    );
  }

  if (platform === "elevenlabs") {
    // The official ConvAI embed floats bottom-right; the fixed wrapper guarantees
    // the corner placement even if the element renders inline.
    return (
      <div
        className="fixed bottom-6 right-6 z-50"
        style={{ ["--accent" as string]: accent }}
        dangerouslySetInnerHTML={{
          __html: `<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>`,
        }}
      />
    );
  }

  if (platform === "hume") {
    return <HumeWidget tenant={tenant} configId={agentId} accent={accent} />;
  }

  if (platform === "vapi") {
    return <VapiWidget tenant={tenant} assistantId={agentId} accent={accent} />;
  }

  return (
    <button
      className="rounded-lg px-5 py-3 font-medium text-white"
      style={{ background: accent }}
    >
      🎤 Talk To Agent
    </button>
  );
}
