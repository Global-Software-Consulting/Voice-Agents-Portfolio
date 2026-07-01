// Bold layout — kinetic and energetic: an animated gradient hero with glass stat
// tiles, a scrolling keyword marquee, alternating feature rows that tilt on hover,
// big-number steps, an interactive FAQ, and a dark footer. Used by Callora.
import { VoiceWidget } from "../components/VoiceWidget";
import { Reveal, Marquee } from "../components/motion";
import { Accordion } from "../components/Accordion";
import { agentIdOf, type LayoutProps } from "./shared";

export function BoldLayout({ cfg, dashboardHref }: LayoutProps) {
  const { branding, landing, platform } = cfg;
  const { primary, accent } = branding.colors;

  return (
    <main className="min-h-screen text-gray-900" style={{ background: branding.colors.background }}>
      {/* Animated gradient hero (nav lives inside it) */}
      <section className="animate-gradient relative overflow-hidden text-white" style={{ backgroundImage: `linear-gradient(125deg, ${primary} 10%, ${accent} 55%, ${primary} 90%)` }}>
        <div className="relative mx-auto max-w-6xl px-6">
          <nav className="flex items-center justify-between py-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-extrabold shadow-sm" style={{ color: primary }}>{cfg.name.charAt(0)}</span>
              <span className="text-lg font-extrabold uppercase tracking-tight">{cfg.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold">
              <a href="#services" className="hidden text-white/80 transition-colors hover:text-white sm:inline">Services</a>
              <a href="#how" className="hidden text-white/80 transition-colors hover:text-white sm:inline">How it works</a>
              <a href={dashboardHref} className="rounded-full bg-white px-4 py-2 font-bold shadow-sm transition-transform hover:-translate-y-0.5" style={{ color: primary }}>Dashboard →</a>
            </div>
          </nav>

          <div className="grid items-center gap-8 py-16 lg:grid-cols-[1.4fr_1fr]">
            <Reveal>
              <span className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest" style={{ background: "rgba(255,255,255,0.16)" }}>{cfg.industry}</span>
              <h1 className="mt-5 text-4xl font-extrabold uppercase leading-[1.02] tracking-tight sm:text-6xl">{landing.hero}</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">{landing.subhero ?? landing.concept}</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a href="#services" className="rounded-full bg-white px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5" style={{ color: primary }}>What we handle</a>
                <span className="text-sm font-medium text-white/85">🎤 or tap the mic, bottom-right</span>
              </div>
              {cfg.testPrompts.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {cfg.testPrompts.map((p) => (
                    <span key={p} className="rounded-full border border-white/30 px-3 py-1 text-sm text-white/90 transition-colors hover:bg-white/10">“{p}”</span>
                  ))}
                </div>
              )}
            </Reveal>

            {landing.stats && landing.stats.length > 0 && (
              <Reveal delay={120}>
                <div className="grid grid-cols-2 gap-4">
                  {landing.stats.map((s) => (
                    <div key={s.label} className="rounded-2xl bg-white/10 p-5 shadow-sm backdrop-blur transition-transform hover:-translate-y-1 hover:bg-white/15">
                      <div className="text-3xl font-extrabold">{s.value}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">{s.label}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        </div>

        {/* Scrolling keyword marquee at the base of the hero */}
        {landing.features && landing.features.length > 0 && (
          <div className="relative border-t border-white/15 py-3">
            <Marquee
              items={landing.features}
              itemClassName="text-sm font-bold uppercase tracking-widest text-white/70"
              separator={<span aria-hidden style={{ color: accent }}>●</span>}
            />
          </div>
        )}
      </section>

      {/* Alternating feature rows that tilt on hover */}
      {landing.services && landing.services.length > 0 && (
        <section id="services" className="mx-auto max-w-5xl px-6 py-24">
          <Reveal><h2 className="text-center text-3xl font-extrabold uppercase tracking-tight">What we handle</h2></Reveal>
          <div className="mt-14 space-y-10">
            {landing.services.map((svc, i) => {
              const flipped = i % 2 === 1;
              return (
                <Reveal key={svc.title} delay={60}>
                  <div className={`group flex flex-col items-center gap-6 sm:flex-row ${flipped ? "sm:flex-row-reverse" : ""}`}>
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl text-4xl shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" style={{ background: `${accent}22` }}>{svc.icon ?? "✨"}</div>
                    <div className={flipped ? "sm:text-right" : ""}>
                      <h3 className="text-xl font-bold">{svc.title}</h3>
                      <p className="mt-2 max-w-xl leading-relaxed text-gray-600">{svc.description}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* Big-number steps */}
      {landing.steps && landing.steps.length > 0 && (
        <section id="how">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Reveal><h2 className="text-center text-3xl font-extrabold uppercase tracking-tight">How it works</h2></Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {landing.steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 110}>
                  <div className="group h-full rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                    <div className="text-5xl font-extrabold transition-transform duration-300 group-hover:scale-110" style={{ color: accent }}>{String(i + 1).padStart(2, "0")}</div>
                    <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why — benefits */}
      {landing.benefits && landing.benefits.length > 0 && (
        <section>
          <div className="mx-auto max-w-5xl px-6 py-24">
            <Reveal><h2 className="text-center text-3xl font-extrabold uppercase tracking-tight">Why {cfg.name}</h2></Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {landing.benefits.map((b, i) => (
                <Reveal key={b.title} delay={i * 90}>
                  <div className="h-full rounded-2xl border-2 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: `${accent}33` }}>
                    <div className="text-4xl font-extrabold" style={{ color: accent }}>{String(i + 1).padStart(2, "0")}</div>
                    <h3 className="mt-3 text-lg font-bold text-gray-900">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{b.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Interactive FAQ cards */}
      {landing.faqs && landing.faqs.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-24">
          <Reveal><h2 className="text-center text-3xl font-extrabold uppercase tracking-tight">FAQs</h2></Reveal>
          <Reveal delay={80} className="mt-12">
            <Accordion items={landing.faqs} accent={accent} variant="cards" />
          </Reveal>
        </section>
      )}

      {/* CTA band */}
      <section className="animate-gradient text-white" style={{ backgroundImage: `linear-gradient(125deg, ${primary}, ${accent}, ${primary})` }}>
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <Reveal>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">{branding.tagline}</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">Tap the button and talk to {cfg.name} right now.</p>
          </Reveal>
        </div>
      </section>

      {/* Slim footer */}
      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-gray-600 sm:flex-row">
          <span>© 2026 {cfg.name}</span>
          <div className="flex gap-6">
            <a href="#services" className="transition-colors hover:text-gray-900">Services</a>
            <a href="#how" className="transition-colors hover:text-gray-900">How it works</a>
            <a href={dashboardHref} className="transition-colors hover:text-gray-900">Dashboard</a>
          </div>
        </div>
      </footer>

      {/* Voice widget — floats bottom-right */}
      <VoiceWidget agentId={agentIdOf(cfg)} platform={platform} accent={accent} tenant={cfg.slug} />
    </main>
  );
}
