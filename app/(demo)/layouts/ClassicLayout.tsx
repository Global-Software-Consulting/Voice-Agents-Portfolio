// "Classic" slot — reimagined as a dark, premium product theme: a floating pill
// navbar, a glowing asymmetric hero with a live typing demo, a scrolling feature
// marquee, a bento service grid, an animated timeline, and a dark FAQ. The voice
// widget floats in the bottom-right corner. Used by Nestriq (real estate).
import { VoiceWidget } from "../components/VoiceWidget";
import { Reveal, Marquee } from "../components/motion";
import { TypingChat } from "../components/TypingChat";
import { Accordion } from "../components/Accordion";
import { agentIdOf, type LayoutProps } from "./shared";

const CANVAS = "#2e4b47"; // mid-tone deep teal — a real color, not black, not light

export function ClassicLayout({ cfg, dashboardHref }: LayoutProps) {
  const { branding, landing } = cfg;
  const { primary, accent } = branding.colors;

  return (
    <main className="min-h-screen text-gray-300" style={{ background: CANVAS }}>
      {/* Floating pill navbar */}
      <header className="fixed inset-x-0 top-4 z-40 px-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
              {cfg.name.charAt(0)}
            </span>
            <span className="text-sm font-semibold text-white">{cfg.name}</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#how" className="hidden text-sm text-gray-400 transition-colors hover:text-white sm:inline">How it works</a>
            <a href="#services" className="hidden text-sm text-gray-400 transition-colors hover:text-white sm:inline">Capabilities</a>
            <a href={dashboardHref} className="rounded-full px-3.5 py-1.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
              Dashboard →
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-24">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-20 blur-[130px] animate-float" style={{ background: accent }} />
          <div className="absolute right-0 top-40 h-[28rem] w-[28rem] rounded-full opacity-15 blur-[130px] animate-float-slow" style={{ background: "#0b3b34" }} />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>{cfg.industry}</span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
              {landing.hero}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-400">{landing.subhero ?? landing.concept}</p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#how" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
                See how it works <span aria-hidden>↓</span>
              </a>
              <span className="text-sm text-gray-300">🎤 or tap the mic, bottom-right</span>
            </div>

            {landing.stats && landing.stats.length > 0 && (
              <div className="mt-12 grid max-w-lg grid-cols-4 gap-4">
                {landing.stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold text-white" style={{ color: accent }}>{s.value}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-300">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </Reveal>

          {/* Glass demo card with live typing conversation */}
          <Reveal delay={140}>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] opacity-40 blur-3xl" style={{ background: `radial-gradient(circle at 40% 20%, ${accent}, transparent 65%)` }} />
              <div className="animate-float-slow relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="ml-2 text-xs text-gray-300">Live call · {cfg.name}</span>
                </div>
                <div className="mt-5">
                  <TypingChat
                    turns={landing.conversation?.turns ?? [{ side: "agent", text: `Hi, this is ${cfg.name}. How can I help you today?` }]}
                    color={accent}
                    outcomes={landing.conversation?.outcomes ?? []}
                    tone="dark"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Feature marquee */}
      {landing.features && landing.features.length > 0 && (
        <div className="border-y border-white/10 py-4">
          <Marquee
            items={landing.features}
            itemClassName="text-sm font-medium uppercase tracking-widest text-gray-300"
            separator={<span aria-hidden style={{ color: accent }}>◆</span>}
          />
        </div>
      )}

      {/* Bento capabilities grid */}
      {landing.services && landing.services.length > 0 && (
        <section id="services" className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>Capabilities</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything, working on every call</h2>
            </div>
          </Reveal>
          <div className="mt-12 grid auto-rows-[minmax(0,1fr)] gap-4 md:grid-cols-3">
            {landing.services.map((svc, i) => {
              const big = i === 0;
              return (
                <Reveal key={svc.title} delay={(i % 3) * 80} className={big ? "md:col-span-2 md:row-span-2" : ""}>
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]">
                    <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40" style={{ background: accent }} />
                    <div className="relative flex h-full flex-col">
                      <div className={`flex items-center justify-center rounded-xl ${big ? "h-14 w-14 text-3xl" : "h-11 w-11 text-xl"}`} style={{ background: `${accent}1f` }}>{svc.icon ?? "✨"}</div>
                      <h3 className={`mt-4 font-semibold text-white ${big ? "text-2xl" : "text-base"}`}>{svc.title}</h3>
                      <p className={`mt-2 leading-relaxed text-gray-400 ${big ? "text-base max-w-md" : "text-sm"}`}>{svc.description}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* Steps timeline */}
      {landing.steps && landing.steps.length > 0 && (
        <section id="how" className="relative border-y border-white/10 py-28" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>How it works</span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">From first hello to a booked outcome</h2>
              </div>
            </Reveal>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {landing.steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 110}>
                  <div className="relative">
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>{i + 1}</span>
                      {i < landing.steps!.length - 1 && <span className="hidden h-px flex-1 bg-gradient-to-r from-white/20 to-transparent md:block" />}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">{step.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why — benefits */}
      {landing.benefits && landing.benefits.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Why {cfg.name}</h2>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {landing.benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 90}>
                <div className="border-t border-white/10 pt-6">
                  <div className="text-sm font-semibold" style={{ color: accent }}>0{i + 1}</div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{b.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {landing.faqs && landing.faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-28">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Questions, answered</h2>
          </Reveal>
          <Reveal delay={80} className="mt-12">
            <Accordion items={landing.faqs} accent={accent} tone="dark" />
          </Reveal>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.05] px-8 py-12 md:flex-row md:items-center" style={{ borderLeft: `3px solid ${accent}` }}>
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">Talk to {cfg.name} in real time</h2>
              <p className="mt-2 max-w-md text-gray-300">Ask about your property, your timeline, or a cash offer — the mic is in the corner.</p>
            </div>
            <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl" style={{ background: `${accent}22`, color: accent }}>🎤</span>
          </div>
        </Reveal>
      </section>

      {/* Footer — slim single row */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-gray-400 sm:flex-row">
          <span>© 2026 {cfg.name}</span>
          <div className="flex gap-6">
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#services" className="transition-colors hover:text-white">Capabilities</a>
            <a href={dashboardHref} className="transition-colors hover:text-white">Dashboard</a>
          </div>
        </div>
      </footer>

      {/* Voice widget — floats bottom-right */}
      <VoiceWidget agentId={agentIdOf(cfg)} platform={cfg.platform} accent={accent} tenant={cfg.slug} />
    </main>
  );
}
