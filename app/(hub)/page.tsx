// Hub: voice.gsoftconsulting.com — showcase of all demos.
// Each card links to a live demo subdomain. See docs/ARCHITECTURE.md.

import { headers } from "next/headers";

// Build a tenant URL from the CURRENT host so links work in every environment:
//   localhost:3000          -> http://nestriq.localhost:3000
//   lvh.me:3000             -> http://nestriq.lvh.me:3000
//   voice.gsoftconsulting.com -> https://nestriq.voice.gsoftconsulting.com
function tenantUrl(host: string, slug: string): string {
  const hostname = host.split(":")[0];
  const isLocal =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith("lvh.me") ||
    hostname === "127.0.0.1";
  const protocol = isLocal ? "http" : "https";
  // The hub runs on the root host (e.g. voice.gsoftconsulting.com or lvh.me:3000),
  // so the tenant URL is just <slug> prepended to the current host.
  return `${protocol}://${slug}.${host}`;
}

type Demo = {
  slug: string;
  name: string;
  platform: string;
  industry: string;
  tagline: string;
};

const DEMOS: Demo[] = [
  { slug: "nestriq", name: "Nestriq AI", platform: "ElevenLabs", industry: "Real Estate", tagline: "AI-powered property acquisition specialist." },
  { slug: "callora", name: "Callora AI", platform: "Vapi", industry: "Home Services", tagline: "Never miss another customer call." },
  { slug: "medelynx", name: "Medelynx AI", platform: "Retell AI", industry: "Healthcare", tagline: "AI front desk for modern clinics." },
  { slug: "lexora", name: "Lexora AI", platform: "Hume AI", industry: "Personal Injury Law", tagline: "The first conversation every client deserves." },
  { slug: "qualivo", name: "Qualivo AI", platform: "Ultravox", industry: "B2B SaaS / Agency Sales", tagline: "Qualify leads before your team gets involved." },
  { slug: "voxium", name: "Voxium Labs", platform: "Deepgram", industry: "Voice Tech Showcase", tagline: "Speech intelligence and transcription lab." },
];

export default async function HubPage() {
  const host = (await headers()).get("host") ?? "voice.gsoftconsulting.com";
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">GSoft AI Voice Agents</h1>
      <p className="mt-3 text-lg text-gray-600">
        Live AI Voice Agent demos you can test yourself.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {DEMOS.map((d) => (
          <a
            key={d.slug}
            href={tenantUrl(host, d.slug)}
            className="block rounded-xl border border-gray-200 p-6 transition hover:border-gray-400 hover:shadow-md"
          >
            <div className="text-sm font-medium text-gray-400">{d.platform}</div>
            <div className="mt-1 text-xl font-semibold">{d.name}</div>
            <div className="mt-1 text-sm text-gray-500">{d.industry}</div>
            <p className="mt-3 text-sm text-gray-700">{d.tagline}</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">
              Talk to agent →
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
