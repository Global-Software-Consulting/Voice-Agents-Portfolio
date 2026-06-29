// Lightweight password gate for the admin dashboard. Server-side only (Node
// runtime) — runs in the dashboard server component + the login/logout route
// handlers, so it can use Node crypto and read/write httpOnly cookies.
//
// Configure with ADMIN_PASSWORD (and optionally ADMIN_AUTH_SECRET). If
// ADMIN_PASSWORD is unset, the gate is DISABLED (dashboard open) — fine for local
// dev, but you MUST set it in production.

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "admin_session";

// Whether a password is configured (i.e. the gate is active).
export function adminAuthConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

// The opaque session token stored in the cookie: HMAC(secret, password). Stable
// for a given password, never reveals it, and is httpOnly so it can't be read by JS.
function expectedToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const secret = process.env.ADMIN_AUTH_SECRET ?? "gsoft-voice-admin-v1";
  return createHmac("sha256", secret).update(pw).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// True if the request carries a valid session cookie (or the gate is disabled).
export async function isAdminAuthed(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return true; // gate disabled (no password configured)
  const got = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!got && safeEqual(got, expected);
}

// Verify a submitted password; returns the session token to set on success, else null.
export function verifyPassword(input: string): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  if (!safeEqual(input, pw)) return null;
  return expectedToken();
}
