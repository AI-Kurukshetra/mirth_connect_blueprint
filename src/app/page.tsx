import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 hb-grid-bg opacity-70" />
      <div className="pointer-events-none absolute left-[-12%] top-[-8%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(121,211,196,0.3)_0%,transparent_66%)]" />
      <div className="pointer-events-none absolute bottom-[-14%] right-[-10%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(182,132,47,0.22)_0%,transparent_68%)]" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6">
        <section className="glass hb-animate-in-scale w-full rounded-[40px] border border-white/70 px-8 py-10 shadow-[0_34px_100px_rgba(17,32,42,0.12)] sm:px-12 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-line/80 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Healthcare integration operations
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="hb-glow-teal flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#12303a_0%,#0f6d69_100%)]">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </div>
                <div>
                  <p className="display-face text-4xl text-ink">MedFlow</p>
                  <p className="mt-1 text-sm uppercase tracking-[0.2em] text-muted">Clinical data command center</p>
                </div>
              </div>

              <h1 className="display-face mt-10 max-w-3xl text-5xl leading-[0.94] text-ink sm:text-6xl">
                Route HL7 and FHIR traffic with a calmer operations surface.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg">
                MedFlow gives operators one place to manage channels, inspect message flow, monitor connector health,
                and review incidents without the noise of legacy integration consoles.
              </p>

              <div className="hb-ekg-line mt-8 w-56" />

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(17,32,42,0.18)] hover:-translate-y-0.5 hover:bg-teal"
                >
                  Open Workspace
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-line-strong bg-white/76 px-7 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/20 hover:bg-white"
                >
                  Create Operator Account
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[28px] border border-white/75 bg-[rgba(19,48,58,0.94)] p-6 text-white shadow-[0_24px_60px_rgba(17,32,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Live posture</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <p className="display-face text-4xl">24/7</p>
                    <p className="mt-2 text-sm text-white/72">Channel and connector visibility</p>
                  </div>
                  <div>
                    <p className="display-face text-4xl">HL7 + FHIR</p>
                    <p className="mt-2 text-sm text-white/72">One operational surface for mixed data formats</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-line/80 bg-white/70 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Included surfaces</p>
                <ul className="mt-5 space-y-4 text-sm text-ink">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal" />
                    Channels, connectors, monitoring, and audit views
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                    Message visibility with seeded healthcare traffic
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-alert" />
                    Error triage and operational incident tracking
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
