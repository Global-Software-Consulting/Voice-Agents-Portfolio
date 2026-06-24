// Server-side Supabase client using the service role key.
// Bypasses RLS — only ever import this from server code (API routes, server
// components). The public demo sites write through here, never directly.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
