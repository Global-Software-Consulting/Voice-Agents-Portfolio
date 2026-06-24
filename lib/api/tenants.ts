// Resolve a tenant slug -> tenant_id (uuid). Self-seeds the tenants table from
// the registry on first use, so a new demo works without a manual DB insert.

import { getServiceClient } from "../supabase/server";
import { getTenant } from "../tenants/registry";

const idCache = new Map<string, string>();

export async function ensureTenant(slug: string): Promise<string> {
  const cached = idCache.get(slug);
  if (cached) return cached;

  const sb = getServiceClient();
  const cfg = getTenant(slug);
  const { data, error } = await sb
    .from("tenants")
    .upsert(
      {
        slug,
        name: cfg?.name ?? slug,
        platform: cfg?.platform ?? "unknown",
        industry: cfg?.industry ?? null,
        config: cfg ?? null,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error) throw error;
  idCache.set(slug, data.id);
  return data.id;
}
