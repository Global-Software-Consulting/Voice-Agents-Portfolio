// Multi-tenant routing. Two modes — the same codebase supports both:
//
// 1. WILDCARD mode (NEXT_PUBLIC_ACTIVE_TENANT unset) — one deployment serves
//    everything; the subdomain in the Host header picks the tenant:
//      nestriq.voice.gsoftconsulting.com  -> /site/nestriq  (demo)
//      admin.voice.gsoftconsulting.com    -> /dashboard     (admin)
//      voice.gsoftconsulting.com          -> /              (hub)
//
// 2. SINGLE-TENANT mode (NEXT_PUBLIC_ACTIVE_TENANT set, e.g. "lexora") — this
//    whole domain IS one agent. Every request renders that tenant's demo; the
//    hub is never served. Used to deploy each agent on its own domain (one
//    Vercel project per agent, same repo + same Supabase, different env var).
//    See docs/ARCHITECTURE.md → "Deployment topologies".
//
// Local dev: use *.lvh.me:3000 (resolves to 127.0.0.1), e.g. nestriq.lvh.me:3000.
// The URL the visitor sees never changes; only the internal path is rewritten.

import { NextResponse, type NextRequest } from "next/server";

// When set, lock this deployment to a single tenant (single-tenant mode).
const ACTIVE_TENANT = process.env.NEXT_PUBLIC_ACTIVE_TENANT?.trim();

// Hosts that should render the hub, not a tenant.
const RESERVED = new Set(["", "www", "voice", "app"]);

function getSubdomain(hostname: string): string {
  const host = hostname.split(":")[0]; // strip port
  // Production: <sub>.voice.gsoftconsulting.com
  if (host.endsWith(".voice.gsoftconsulting.com")) {
    return host.replace(".voice.gsoftconsulting.com", "");
  }
  if (host === "voice.gsoftconsulting.com") return "";
  // Local dev: <sub>.lvh.me or <sub>.localhost
  if (host.endsWith(".lvh.me")) return host.replace(".lvh.me", "");
  if (host.endsWith(".localhost")) return host.replace(".localhost", "");
  return "";
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const suffix = url.pathname === "/" ? "" : url.pathname;

  // SINGLE-TENANT mode: this domain is one agent. Serve its demo, plus its OWN
  // admin dashboard (scoped to this agent). The admin is reachable two ways:
  //   - admin.<domain>   (custom domains)
  //   - <domain>/admin   (works anywhere, incl. *.vercel.app where you can't add subdomains)
  // No hub, no other tenants.
  if (ACTIVE_TENANT) {
    const stHost = (req.headers.get("host") ?? "").split(":")[0];
    if (stHost.startsWith("admin.")) {
      url.pathname = `/dashboard${suffix}`;
      return NextResponse.rewrite(url);
    }
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      url.pathname = `/dashboard${url.pathname.slice("/admin".length)}`;
      return NextResponse.rewrite(url);
    }
    url.pathname = `/site/${ACTIVE_TENANT}${suffix}`;
    return NextResponse.rewrite(url);
  }

  // WILDCARD mode: pick the tenant from the Host header's subdomain.
  const host = req.headers.get("host") ?? "";
  const sub = getSubdomain(host);

  if (RESERVED.has(sub)) return NextResponse.next(); // hub

  if (sub === "admin") {
    url.pathname = `/dashboard${suffix}`;
    return NextResponse.rewrite(url);
  }

  // Any other subdomain is treated as a tenant; the page 404s if unknown.
  url.pathname = `/site/${sub}${suffix}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals, API routes, and static files.
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
