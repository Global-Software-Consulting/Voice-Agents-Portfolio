// Subdomain-based multi-tenant routing.
//
//   nestriq.voice.gsoftconsulting.com  -> rewrite to /site/nestriq  (demo)
//   admin.voice.gsoftconsulting.com    -> rewrite to /dashboard     (admin)
//   voice.gsoftconsulting.com          -> /                         (hub)
//
// Local dev: use *.lvh.me:3000 (resolves to 127.0.0.1), e.g. nestriq.lvh.me:3000.
// The URL the visitor sees never changes; only the internal path is rewritten.

import { NextResponse, type NextRequest } from "next/server";

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
  const host = req.headers.get("host") ?? "";
  const sub = getSubdomain(host);
  const url = req.nextUrl.clone();

  if (RESERVED.has(sub)) return NextResponse.next(); // hub

  const suffix = url.pathname === "/" ? "" : url.pathname;

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
