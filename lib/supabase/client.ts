// Browser-side Supabase client (anon key) — used for Realtime subscriptions in
// the demo panels. Returns null if env is not configured so the UI can degrade
// gracefully.
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key);
  return cached;
}
