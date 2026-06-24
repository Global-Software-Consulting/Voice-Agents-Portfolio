// Source of truth: subdomain -> TenantConfig.
// middleware.ts resolves the subdomain and looks the tenant up here.
//
// To add a demo: create a new file (e.g. ./acme.ts) exporting a TenantConfig,
// import it, and add it to the map below. Then it self-seeds the `tenants` table
// on first call. No new pages, no new tables. See docs/ARCHITECTURE.md.

import type { TenantConfig } from "./types";
import { nestriq } from "./nestriq";

// import { callora } from "./callora";
// import { medelynx } from "./medelynx";
// import { lexora } from "./lexora";
// import { qualivo } from "./qualivo";
// import { voxium } from "./voxium";

export const TENANTS: Record<string, TenantConfig> = {
  nestriq,
  // callora,
  // medelynx,
  // lexora,
  // qualivo,
  // voxium,
};

export function getTenant(subdomain: string): TenantConfig | undefined {
  return TENANTS[subdomain];
}

// Reverse lookup: find a tenant by its voice-platform agent id. Used by webhooks
// that are configured workspace-wide (e.g. ElevenLabs post-call) and can't carry
// a ?tenant query param, but do include the agent id in the payload.
export function getTenantByAgentId(agentId: string): TenantConfig | undefined {
  if (!agentId) return undefined;
  return Object.values(TENANTS).find(
    (t) => t.platformConfig.agentId && t.platformConfig.agentId === agentId,
  );
}
