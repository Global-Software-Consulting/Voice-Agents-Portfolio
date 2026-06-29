// Password gate shown when the admin dashboard requires auth and the request
// isn't authenticated. Posts to /api/admin/login, which sets the session cookie.
"use client";

import { useState } from "react";

const BRAND = "#0f766e";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
    } catch {
      /* fall through to error */
    }
    setLoading(false);
    setError(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ background: BRAND }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="mt-5 text-center text-lg font-semibold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          Enter the password to continue.
        </p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-6 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
        />

        {error && (
          <p className="mt-2 text-sm text-rose-600">Incorrect password. Try again.</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-5 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ background: BRAND }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
