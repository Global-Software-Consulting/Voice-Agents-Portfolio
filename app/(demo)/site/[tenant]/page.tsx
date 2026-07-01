// Per-tenant demo landing page. The proxy rewrites <tenant>.<host>/ to /site/<tenant>.
// Content comes from the tenant config; the *layout* is chosen per tenant so no two
// demos look alike (see app/(demo)/layouts/*).

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTenant } from "@/lib/tenants/registry";
import { ClassicLayout } from "../../layouts/ClassicLayout";
import { EditorialLayout } from "../../layouts/EditorialLayout";
import { BoldLayout } from "../../layouts/BoldLayout";

// Per-tenant page title/description (root layout adds the "· GSoft AI Voice Agents"
// suffix).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant } = await params;
  const cfg = getTenant(tenant);
  if (!cfg) return {};
  return {
    // `absolute` bypasses the root "· GSoft AI Voice Agents" suffix so each demo
    // reads as its own standalone product in the browser tab.
    title: { absolute: cfg.name },
    description: cfg.branding.tagline ?? cfg.landing.concept,
    // Override the root application-name meta so the demo is fully white-labeled.
    applicationName: cfg.name,
  };
}

// Build the admin-dashboard URL for this tenant from the current host.
// Priority:
//   1. NEXT_PUBLIC_ADMIN_URL — explicit override (e.g. a dedicated admin domain).
//   2. SINGLE-TENANT deploy (NEXT_PUBLIC_ACTIVE_TENANT set) — same host, /admin path.
//   3. WILDCARD deploy — the admin.<host> subdomain.
function adminUrl(host: string, slug: string): string {
  const override = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (override) {
    return `${override.replace(/\/$/, "")}/?tenant=${slug}`;
  }
  if (process.env.NEXT_PUBLIC_ACTIVE_TENANT) {
    return `/admin?tenant=${slug}`;
  }
  const [hostname, port] = host.split(":");
  const isLocal =
    hostname.endsWith("lvh.me") ||
    hostname.endsWith("localhost") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";
  const protocol = isLocal ? "http" : "https";
  const parts = hostname.split(".");
  if (parts.length > 1) {
    parts[0] = "admin";
  } else {
    parts.unshift("admin");
  }
  const base = parts.join(".") + (port ? `:${port}` : "");
  return `${protocol}://${base}/?tenant=${slug}`;
}

export default async function DemoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const cfg = getTenant(tenant);
  if (!cfg) notFound();

  const host = (await headers()).get("host") ?? "voice.gsoftconsulting.com";
  const dashboardHref = adminUrl(host, cfg.slug);

  // Each demo renders a structurally different layout, chosen by tenant config.
  const props = { cfg, dashboardHref };
  switch (cfg.branding.layout) {
    case "editorial":
      return <EditorialLayout {...props} />;
    case "bold":
      return <BoldLayout {...props} />;
    default:
      return <ClassicLayout {...props} />;
  }
}
