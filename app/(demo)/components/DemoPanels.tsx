// Live demo panels: Live Transcript, Function Calls, Extracted Data.
// Polls a server route (service-role, read-only) every few seconds so it works
// without opening tables to the anon key. Reads the SAME shared tables the admin
// dashboard reads. Data appears as the AI invokes tools / after the call webhook.
"use client";

import { useEffect, useState } from "react";

type FnCall = { name: string; arguments: unknown; result: unknown; created_at: string };
type Activity = { functionCalls: FnCall[]; transcript: string; summary: string };

export function DemoPanels({ tenant, accent }: { tenant: string; accent: string }) {
  const [data, setData] = useState<Activity>({
    functionCalls: [],
    transcript: "",
    summary: "",
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
    <section className="mt-14 grid gap-6 lg:grid-cols-3">
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
    </section>
  );
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
