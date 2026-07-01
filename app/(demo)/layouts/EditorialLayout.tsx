// Editorial layout — a refined, magazine feel: Fraunces display serif, a soft
// gold wash, staggered reveals, a hand-drawn gold rule, gold hover underlines on
// the services list, and an animated vertical timeline. Used by Lexora (legal).
import { VoiceWidget } from "../components/VoiceWidget";
import { Reveal } from "../components/motion";
import { agentIdOf, type LayoutProps } from "./shared";

export function EditorialLayout({ cfg, dashboardHref }: LayoutProps) {
  const { branding, landing, platform } = cfg;
  const { primary, accent } = branding.colors;

  return (
    <main className="min-h-screen font-serif text-gray-900" style={{ background: branding.colors.background }}>
      {/* Thin top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="font-serif text-lg font-semibold tracking-tight" style={{ color: primary }}>{cfg.name}</div>
          <nav className="flex items-center gap-6 font-sans text-sm">
            <a href="#how" className="hidden text-gray-600 transition-colors hover:text-gray-900 sm:inline">Process</a>
            <a href="#services" className="hidden text-gray-600 transition-colors hover:text-gray-900 sm:inline">What we do</a>
            <a href={dashboardHref} className="grow-underline font-medium" style={{ color: primary }}>Admin →</a>
          </nav>
        </div>
      </header>

      {/* Centered hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl animate-float-slow" style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />
        <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
          <p className="animate-in-up font-sans text-xs uppercase tracking-[0.28em]" style={{ color: accent }}>{cfg.industry}</p>
          <h1 className="animate-in-up mx-auto mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.14] tracking-tight sm:text-5xl" style={{ animationDelay: "80ms" }}>{landing.hero}</h1>
          <span className="animate-in-up mx-auto mt-7 block h-[3px] w-24 rounded-full" style={{ background: accent, animationDelay: "220ms" }} />
          <p className="animate-in-up mx-auto mt-7 max-w-2xl font-sans text-lg leading-relaxed text-gray-600" style={{ animationDelay: "160ms" }}>{landing.subhero ?? landing.concept}</p>
          <div className="animate-in-up mt-9 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: "240ms" }}>
            <a href="#how" className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5" style={{ background: primary }}>See how it works</a>
            <span className="text-sm text-gray-500">🎤 or tap the mic, bottom-right</span>
          </div>
          {cfg.testPrompts.length > 0 && (
            <div className="animate-in-up mt-8 flex flex-wrap justify-center gap-2 font-sans" style={{ animationDelay: "320ms" }}>
              {cfg.testPrompts.map((p) => (
                <span key={p} className="rounded-full border bg-white/40 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-white" style={{ borderColor: `${accent}55` }}>“{p}”</span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pull-quote */}
      <section className="border-y bg-white" style={{ borderColor: `${primary}22` }}>
        <Reveal>
          <blockquote className="mx-auto max-w-3xl px-6 py-14 text-center font-serif text-2xl italic leading-relaxed" style={{ color: primary }}>
            “{branding.tagline}”
          </blockquote>
        </Reveal>
      </section>

      {/* Inline stat strip */}
      {landing.stats && landing.stats.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-12 font-sans">
            {landing.stats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-10">
                <Reveal delay={i * 90} className="text-center">
                  <div className="font-serif text-3xl font-semibold" style={{ color: primary }}>{s.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">{s.label}</div>
                </Reveal>
                {i < landing.stats!.length - 1 && <span className="hidden h-10 w-px bg-gray-200 sm:block" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vertical timeline */}
      {landing.steps && landing.steps.length > 0 && (
        <section id="how" className="mx-auto max-w-3xl px-6 py-24 font-sans">
          <Reveal><h2 className="text-center font-serif text-3xl font-semibold">How it works</h2></Reveal>
          <ol className="relative mt-12 space-y-10 border-l pl-8" style={{ borderColor: `${accent}55` }}>
            {landing.steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 120}>
                <li className="relative">
                  <span className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm" style={{ background: primary }}>{i + 1}</span>
                  <h3 className="font-serif text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{step.description}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {/* Services list with gold hover underline */}
      {landing.services && landing.services.length > 0 && (
        <section id="services" className="border-t border-gray-200/70 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-24 font-sans">
            <Reveal><h2 className="text-center font-serif text-3xl font-semibold">What we do</h2></Reveal>
            <div className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
              {landing.services.map((svc, i) => (
                <Reveal key={svc.title} delay={(i % 2) * 90}>
                  <div className="group flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition-transform duration-300 group-hover:scale-110" style={{ background: `${accent}1f` }}>{svc.icon ?? "•"}</div>
                    <div>
                      <h3 className="relative inline-block font-serif text-base font-semibold">
                        {svc.title}
                        <span className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" style={{ background: accent }} />
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{svc.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why — benefits */}
      {landing.benefits && landing.benefits.length > 0 && (
        <section className="border-t border-gray-200/70 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-24 font-sans">
            <Reveal><h2 className="text-center font-serif text-3xl font-semibold">Why {cfg.name}</h2></Reveal>
            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {landing.benefits.map((b, i) => (
                <Reveal key={b.title} delay={i * 90}>
                  <div className="border-t-2 pt-5" style={{ borderColor: accent }}>
                    <h3 className="font-serif text-lg font-semibold">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{b.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Split FAQ */}
      {landing.faqs && landing.faqs.length > 0 && (
        <section className="border-t border-gray-200/70">
          <div className="mx-auto grid max-w-4xl gap-10 px-6 py-24 font-sans md:grid-cols-[1fr_2fr]">
            <Reveal><h2 className="font-serif text-3xl font-semibold">Questions,<br />answered.</h2></Reveal>
            <div className="space-y-7">
              {landing.faqs.map((f, i) => (
                <Reveal key={f.q} delay={i * 90}>
                  <div>
                    <h3 className="font-serif font-semibold">{f.q}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{f.a}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Understated CTA */}
      <section className="bg-white px-6 py-14 text-center font-sans">
        <Reveal>
          <p className="font-serif text-2xl" style={{ color: primary }}>Ready when you are.</p>
          <p className="mx-auto mt-2 max-w-md text-gray-500">Speak with {cfg.name} now — the mic is in the bottom-right corner.</p>
        </Reveal>
      </section>

      <footer className="border-t border-gray-200/70 font-sans">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-gray-500 sm:flex-row">
          <span>© 2026 {cfg.name}</span>
          <div className="flex gap-6">
            <a href="#how" className="transition-colors hover:text-gray-900">Process</a>
            <a href="#services" className="transition-colors hover:text-gray-900">What we do</a>
            <a href={dashboardHref} className="transition-colors hover:text-gray-900">Admin</a>
          </div>
        </div>
      </footer>

      {/* Voice widget — floats bottom-right */}
      <VoiceWidget agentId={agentIdOf(cfg)} platform={platform} accent={accent} tenant={cfg.slug} />
    </main>
  );
}
