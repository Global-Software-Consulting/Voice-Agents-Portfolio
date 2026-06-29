// Lead transcript modal. Opens when a lead row is clicked and renders that
// lead's call transcript as a chat thread — agent on the left, caller on the
// right, like a messaging app. The transcript is stored as `role: message`
// lines (see lib/adapters/elevenlabs.ts), which we parse into turns.
"use client";

import { useEffect } from "react";
import type { Call, Lead, Transcript } from "@/lib/admin/data";
import { tenantMeta } from "@/lib/admin/tenants-meta";
import { Icon } from "./icons";

type Turn = { role: "agent" | "user"; text: string };

const USER_LABELS = new Set([
  "user", "caller", "customer", "client", "human", "seller",
  "prospect", "buyer", "patient", "guest", "you",
]);
const AGENT_LABELS = new Set([
  "agent", "assistant", "bot", "ai", "system", "operator",
  "nestriq", "callora", "medelynx", "lexora", "qualivo", "voxium",
]);

function parseTranscript(raw: string, leadName?: string | null): Turn[] {
  const nameLc = leadName?.trim().toLowerCase();
  const turns: Turn[] = [];

  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([^:]{1,30}?)\s*:\s*(.*)$/);
    if (m) {
      const label = m[1].trim().toLowerCase();
      const isUser = USER_LABELS.has(label) || (!!nameLc && label === nameLc);
      const isAgent = AGENT_LABELS.has(label);
      if (isUser || isAgent) {
        turns.push({ role: isUser ? "user" : "agent", text: m[2].trim() });
        continue;
      }
    }
    // Continuation of the previous turn (a message that spans lines).
    const text = line.trim();
    if (!text) continue;
    if (turns.length) turns[turns.length - 1].text += `\n${text}`;
    else turns.push({ role: "agent", text });
  }

  return turns.filter((t) => t.text.trim().length > 0);
}

function fmtDuration(seconds?: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });
}

export function TranscriptModal({
  lead,
  call,
  transcript,
  onClose,
}: {
  lead: Lead;
  call: Call | null;
  transcript: Transcript | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const m = tenantMeta(lead.tenant);
  const turns = transcript?.transcript
    ? parseTranscript(transcript.transcript, lead.name)
    : [];
  const callerName = lead.name || call?.caller_name || "Caller";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-100 p-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
            style={{ background: m.color }}
          >
            {(lead.name?.[0] ?? "?").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-gray-900">
                {lead.name ?? "Unnamed lead"}
              </h2>
              {lead.score != null && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: `${m.color}1a`, color: m.color }}
                >
                  Score {lead.score}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                {m.name}
              </span>
              {lead.phone && (
                <span className="inline-flex items-center gap-1">
                  <Icon.phone width={13} height={13} /> {lead.phone}
                </span>
              )}
              {lead.email && (
                <span className="inline-flex items-center gap-1">
                  <Icon.mail width={13} height={13} /> {lead.email}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Icon.clock width={13} height={13} /> {fmtDuration(call?.duration)}
              </span>
              <span>{fmtDate(call?.started_at ?? lead.created_at)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <Icon.x />
          </button>
        </div>

        {/* Summary */}
        {transcript?.summary && (
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Call summary
            </div>
            <p className="mt-1 text-sm text-gray-700">{transcript.summary}</p>
          </div>
        )}

        {/* Chat thread */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/60 px-4 py-5 sm:px-6">
          {turns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Icon.message />
              </span>
              <p className="text-sm font-medium text-gray-600">
                No transcript available
              </p>
              <p className="max-w-xs text-xs text-gray-400">
                This lead isn&apos;t linked to a recorded call transcript yet. It
                appears once the call&apos;s post-call webhook is processed.
              </p>
            </div>
          ) : (
            turns.map((t, i) => (
              <Bubble
                key={i}
                role={t.role}
                text={t.text}
                speaker={t.role === "user" ? callerName : `${m.name}`}
                color={m.color}
                showLabel={turns[i - 1]?.role !== t.role}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
          <span>
            {turns.length > 0
              ? `${turns.length} messages`
              : "Transcript view"}
          </span>
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> Agent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />{" "}
              {callerName}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  role,
  text,
  speaker,
  color,
  showLabel,
}: {
  role: "agent" | "user";
  text: string;
  speaker: string;
  color: string;
  showLabel: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {showLabel && (
        <span className="mb-1 px-1 text-[11px] font-medium text-gray-400">
          {speaker}
        </span>
      )}
      <div
        className={[
          "max-w-[80%] whitespace-pre-wrap break-words px-3.5 py-2 text-sm shadow-sm",
          isUser
            ? "rounded-2xl rounded-br-md text-white"
            : "rounded-2xl rounded-bl-md border border-gray-200 bg-white text-gray-800",
        ].join(" ")}
        style={isUser ? { background: color } : undefined}
      >
        {text}
      </div>
    </div>
  );
}
