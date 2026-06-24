// Display metadata for every demo tenant (not just the active ones), used by the
// admin dashboard's tenant filter, color-coded charts, and badges. Data for any
// of the 6 demos can land in the shared tables, so the dashboard knows all of
// them regardless of which are wired up in lib/tenants/registry.ts.

export type TenantMeta = {
  slug: string;
  name: string;
  platform: string;
  industry: string;
  color: string;
};

export const TENANT_META: TenantMeta[] = [
  { slug: "nestriq", name: "Nestriq AI", platform: "ElevenLabs", industry: "Real Estate", color: "#14b8a6" },
  { slug: "callora", name: "Callora AI", platform: "Vapi", industry: "Home Services", color: "#f97316" },
  { slug: "medelynx", name: "Medelynx AI", platform: "Retell AI", industry: "Healthcare", color: "#3b82f6" },
  { slug: "lexora", name: "Lexora AI", platform: "Hume AI", industry: "Personal Injury Law", color: "#8b5cf6" },
  { slug: "qualivo", name: "Qualivo AI", platform: "Ultravox", industry: "B2B SaaS / Sales", color: "#ec4899" },
  { slug: "voxium", name: "Voxium Labs", platform: "Deepgram", industry: "Voice Tech", color: "#0ea5e9" },
];

const BY_SLUG = new Map(TENANT_META.map((t) => [t.slug, t]));

export function tenantMeta(slug: string): TenantMeta {
  return (
    BY_SLUG.get(slug) ?? {
      slug,
      name: slug,
      platform: "—",
      industry: "—",
      color: "#64748b",
    }
  );
}

export function tenantColor(slug: string): string {
  return tenantMeta(slug).color;
}
