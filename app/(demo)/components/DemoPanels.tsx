// Live demo panels: Live Transcript, Function Calls, Extracted Data, and (for
// emotion-capable demos like Lexora) Emotional Analysis. Polls a server route
// (service-role, read-only) every few seconds so it works without opening tables
// to the anon key. Reads the SAME shared tables the admin dashboard reads. Data
// appears as the AI invokes tools / after the call webhook.
"use client";

import { useEffect, useState } from "react";

type FnCall = { name: string; arguments: unknown; result: unknown; created_at: string };
type Emotion = {
  dominant?: string;
  sentiment?: "negative" | "neutral" | "positive" | string;
  intensity?: number;
  valence?: number;
} | null;
type Activity = {
  functionCalls: FnCall[];
  transcript: string;
  summary: string;
  emotion?: Emotion;
};

export function DemoPanels({
  tenant,
  accent,
  showEmotion = false,
}: {
  tenant: string;
  accent: string;
  showEmotion?: boolean;
}) {
  const [data, setData] = useState<Activity>({
    functionCalls: [],
    transcript: "",
    summary: "",
    emotion: null,
  });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/demo/${tenant}/activity`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as Activity;
        if (alive) setData(json);
      } catch {
        /* ignore transient errors */
      }
    };
    load();
    const id = setInterval(load, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tenant]);

  const latest = data.functionCalls[0];

  return (
    <section className="mt-14 space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Live Transcript" accent={accent}>
          {data.transcript ? (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-sm text-gray-700">
              {data.transcript}
            </pre>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="Function Calls" accent={accent}>
          {data.functionCalls.length ? (
            <ul className="space-y-2 text-sm">
              {data.functionCalls.map((f, i) => (
                <li key={i} className="rounded bg-gray-50 px-2 py-1">
                  <span className="font-mono font-medium">{f.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="Extracted Data" accent={accent}>
          {latest ? (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-gray-600">
              {JSON.stringify(latest.arguments ?? {}, null, 2)}
            </pre>
          ) : (
            <Empty />
          )}
        </Panel>
      </div>

      {showEmotion && <EmotionPanel emotion={data.emotion ?? null} accent={accent} />}
    </section>
  );
}

/* -------------------------- Emotional Analysis --------------------------- */

function EmotionPanel({ emotion, accent }: { emotion: Emotion; accent: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: accent }}>
        Emotional Analysis
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          Hume voice AI
        </span>
      </h3>

      {emotion?.dominant ? (
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Dominant emotion</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{emotion.dominant}</div>
          </div>
          <SentimentBadge sentiment={emotion.sentiment} />
          {typeof emotion.intensity === "number" && (
            <div className="min-w-[160px] flex-1">
              <div className="mb-1 flex justify-between text-xs text-gray-400">
                <span>Intensity</span>
                <span>{Math.round(emotion.intensity * 100)}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, emotion.intensity * 100))}%`,
                    background: sentimentColor(emotion.sentiment),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          The caller&apos;s emotional state appears here during a call.
        </p>
      )}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  const s = sentiment ?? "neutral";
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400">Sentiment</div>
      <span
        className="mt-1 inline-block rounded-full px-2.5 py-1 text-sm font-medium capitalize"
        style={{ background: `${sentimentColor(s)}1a`, color: sentimentColor(s) }}
      >
        {s}
      </span>
    </div>
  );
}

function sentimentColor(sentiment?: string): string {
  if (sentiment === "negative") return "#dc2626";
  if (sentiment === "positive") return "#16a34a";
  return "#64748b";
}

function Panel({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold" style={{ color: accent }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-gray-400">Live data appears here during a call.</p>;
}
