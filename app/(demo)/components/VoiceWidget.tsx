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

  if (outOfCredits) {
    return (
      <LeadFallbackForm
        tenant={tenant}
        accent={accent}
        reason="Our voice line is busy right now."
      />
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
      <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-500">
        🎤 <strong>Talk To Agent</strong> — set <code>{envVar}</code> in{" "}
        <code>.env.local</code> to enable the live voice widget.
      </div>
    );
  }

  if (platform === "elevenlabs") {
    // Custom element rendered via innerHTML to avoid JSX typing for the web component.
    return (
      <div
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
