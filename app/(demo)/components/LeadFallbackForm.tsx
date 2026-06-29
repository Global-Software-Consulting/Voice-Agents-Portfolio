// Fallback "request a callback" form, shown when the voice agent is unavailable
// (e.g. out of credits). Captures name/email/phone and POSTs to /api/contact,
// which saves a lead and emails the team via Resend.
"use client";

import { useState } from "react";

type Props = {
  tenant: string;
  accent: string;
  // Short reason shown above the form, e.g. "Our voice line is busy right now."
  reason?: string;
};

export function LeadFallbackForm({ tenant, accent, reason }: Props) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tenant }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
        >
          ✓
        </div>
        <h3 className="mt-3 text-base font-semibold text-gray-900">Thanks — we’ll be in touch</h3>
        <p className="mt-1 text-sm text-gray-600">
          We’ve received your details and someone will reach out shortly.
        </p>
      </div>
    );
  }

  const canSubmit =
    form.name.trim() !== "" && (form.email.trim() !== "" || form.phone.trim() !== "");

  return (
    <form
      onSubmit={submit}
      className="max-w-md rounded-xl border border-gray-200 bg-white p-5"
    >
      <h3 className="text-base font-semibold text-gray-900">
        Prefer we reach out?
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        {reason ?? "Our voice agent is unavailable right now."} Leave your details and
        we’ll get back to you.
      </p>

      <div className="mt-4 space-y-3">
        <input
          required
          value={form.name}
          onChange={set("name")}
          placeholder="Your name"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
        />
        <input
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="Email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
        />
        <input
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          placeholder="Phone"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
        />
      </div>

      {status === "error" && (
        <p className="mt-2 text-sm text-rose-600">
          Something went wrong. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || status === "sending"}
        className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        style={{ background: accent }}
      >
        {status === "sending" ? "Sending…" : "Request a callback"}
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">
        Provide your name and an email or phone.
      </p>
    </form>
  );
}
