// Per-tenant demo landing page. middleware rewrites <tenant>.<host>/ to /site/<tenant>.
// One set of files renders every demo; all content comes from the tenant config.

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTenant } from "@/lib/tenants/registry";
import { VoiceWidget } from "../../components/VoiceWidget";

// Build the admin-dashboard URL for this tenant from the current host:
//   nestriq.lvh.me:3000               -> http://admin.lvh.me:3000/?tenant=nestriq
//   nestriq.voice.gsoftconsulting.com -> https://admin.voice.gsoftconsulting.com/?tenant=nestriq
//   localhost:3000                    -> http://admin.localhost:3000/?tenant=nestriq
// In single-tenant deployments the admin lives on a separate domain — set
// NEXT_PUBLIC_ADMIN_URL (e.g. https://admin.voice.gsoftconsulting.com) and it's used directly.
function adminUrl(host: string, slug: string): string {
  const override = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (override) {
    return `${override.replace(/\/$/, "")}/?tenant=${slug}`;
  }
  const [hostname, port] = host.split(":");
  const isLocal =
    hostname.endsWith("lvh.me") ||
    hostname.endsWith("localhost") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";
  const protocol = isLocal ? "http" : "https";
  const parts = hostname.split(".");
  // Replace the leading subdomain label with "admin"; if the host has no
  // subdomain (e.g. "localhost"), prepend "admin." so it stays resolvable.
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

  const { branding, landing, platform } = cfg;
  const { primary, accent } = branding.colors;
  const host = (await headers()).get("host") ?? "voice.gsoftconsulting.com";
  const dashboardHref = adminUrl(host, cfg.slug);

  console.log("========url======", dashboardHref)
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ---------- Top nav ---------- */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: primary }}
            >
              {cfg.name.charAt(0)}
            </span>
            <div className="leading-tight">
              <div className="text-base font-semibold">{cfg.name}</div>
              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                {cfg.industry}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#how"
              className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:inline"
            >
              How it works
            </a>
            <a
              href="#services"
              className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:inline"
            >
              Services
            </a>
            <a
              href={dashboardHref}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ background: primary }}
            >
              Admin Dashboard <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section
        className="relative overflow-hidden"
        style={{ background: branding.colors.background }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: `${accent}22`, color: primary }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              AI Voice Agent · {platform}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {landing.hero}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
              {landing.subhero ?? landing.concept}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <VoiceWidget
                agentId={cfg.platformConfig.agentId ?? cfg.platformConfig.configId ?? ""}
                platform={platform}
                accent={accent}
                tenant={cfg.slug}
              />
            </div>

            {cfg.testPrompts.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Try saying
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cfg.testPrompts.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
                    >
                      “{p}”
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hero side card */}
          <div className="relative">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs text-gray-400">Live conversation</span>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                {(
                  landing.conversation?.turns ?? [
                    { side: "agent" as const, text: `Hi, this is ${cfg.name}. How can I help you today?` },
                  ]
                ).map((turn, i) => (
                  <Bubble key={i} side={turn.side} color={primary}>
                    {turn.text}
                  </Bubble>
                ))}
                {landing.conversation?.outcomes?.length ? (
                  <div
                    className="mt-4 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                    style={{ background: `${accent}18`, color: primary }}
                  >
                    {landing.conversation.outcomes.map((outcome, i) => (
                      <span key={i}>{outcome}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      {landing.stats && landing.stats.length > 0 && (
        <section className="border-y border-gray-100 bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4">
            {landing.stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold" style={{ color: primary }}>
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- How it works ---------- */}
      {landing.steps && landing.steps.length > 0 && (
        <section id="how" className="mx-auto max-w-6xl px-6 py-20">
          <SectionHeading
            eyebrow="How it works"
            title="From first hello to a booked consultation"
            subtitle="Nestriq handles the entire seller conversation, end to end."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {landing.steps.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-gray-200 bg-white p-6"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: primary }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Services ---------- */}
      {landing.services && landing.services.length > 0 && (
        <section id="services" style={{ background: branding.colors.background }}>
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow="What we provide"
              title="Everything your acquisition team needs"
              subtitle="A full set of capabilities, working together on every call."
            />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {landing.services.map((svc) => (
                <div
                  key={svc.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-md"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                    style={{ background: `${accent}18` }}
                  >
                    <span>{svc.icon ?? "✨"}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{svc.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {svc.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      {landing.faqs && landing.faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-20">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <div className="mt-10 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {landing.faqs.map((f) => (
              <div key={f.q} className="p-6">
                <h3 className="font-semibold text-gray-900">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <section className="px-6 pb-20">
        <div
          className="mx-auto max-w-6xl rounded-3xl px-8 py-14 text-center"
          style={{ background: primary }}
        >
          <h2 className="text-3xl font-bold text-white">{branding.tagline}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Click the voice widget and have a real conversation with {cfg.name} right now.
          </p>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-gray-400 sm:flex-row">
          <span>
            {cfg.name} — {branding.tagline}
          </span>
          <span>Powered by GSoft AI Voice Agents</span>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-gray-600">{subtitle}</p>}
    </div>
  );
}

function Bubble({
  side,
  color,
  children,
}: {
  side: "agent" | "user";
  color?: string;
  children: React.ReactNode;
}) {
  const isAgent = side === "agent";
  return (
    <div className={isAgent ? "flex justify-start" : "flex justify-end"}>
      <div
        className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm"
        style={
          isAgent
            ? { background: `${color}14`, color: "#0f172a" }
            : { background: "#f1f5f9", color: "#0f172a" }
        }
      >
        {children}
      </div>
    </div>
  );
}
