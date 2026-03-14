import Link from "next/link";
import { ArrowRight, ShieldCheck, Stethoscope, Waypoints } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const highlights = [
  {
    title: "HL7 and FHIR orchestration",
    detail: "Run legacy MLLP feeds beside modern FHIR syncs without losing observability.",
  },
  {
    title: "Operational resilience",
    detail: "See queue depth, retry pressure, connector drift, and incident status in one plane.",
  },
  {
    title: "Audit-ready delivery",
    detail: "Message traceability, error history, and connector changes stay visible by default.",
  },
];

export default function HomePage() {
  return (
    <main className="px-4 py-4 lg:px-6">
      <section className="glass mx-auto max-w-[1500px] overflow-hidden rounded-[38px] border border-white/65 px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <Badge tone="good">AI Kurukshetra · MedFlow</Badge>
            <div>
              <h1 className="display-face max-w-5xl text-5xl leading-none text-ink sm:text-6xl lg:text-7xl">
                A live-grade healthcare integration cockpit for the systems nobody else wants to tame.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
                MedFlow replaces brittle Mirth-style operations with a modern, operator-first interface for HL7v2,
                HL7v3, FHIR, REST, and connector reliability. The build is wired for Supabase auth, seeded data,
                and production-style loading states across the app.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href="/login">Enter control room</Link>
              <Link className="inline-flex h-12 items-center justify-center rounded-full border border-line-strong bg-white/78 px-6 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/signup">Create workspace</Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map((item) => (
                <Card key={item.title} className="p-5">
                  <p className="text-lg font-semibold text-ink">{item.title}</p>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(47,169,141,0.22),transparent_60%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Operational topology</p>
                <Waypoints className="h-5 w-5 text-muted" />
              </div>
              {[
                { icon: Stethoscope, label: "Clinical ingress", detail: "Epic, labs, PACS, and payer feeds enter through typed connectors." },
                { icon: ShieldCheck, label: "Safety gates", detail: "Validation, retry rules, and incident capture keep unsafe payloads visible." },
                { icon: ArrowRight, label: "Delivery paths", detail: "Database, REST, MLLP, and SFTP outputs route through one monitoring surface." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[26px] border border-line-strong bg-white/80 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint/12 text-teal">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-ink">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

