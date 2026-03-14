"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, AlertTriangle, ArrowRightLeft, BellRing, Cable, FileClock, FlaskConical, GitBranch, LayoutDashboard, LogOut, Menu, Network, ScrollText, ShieldCheck, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { logoutAction } from "@/lib/actions/auth";
import type { OperatorSummary } from "@/lib/authz";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  requiresWrite: boolean;
  summary: string;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresWrite: false, summary: "Live operational telemetry, watchlists, and message velocity." },
  { href: "/channels", label: "Channels", icon: Network, requiresWrite: false, summary: "Lane health, route posture, and designer entry points." },
  { href: "/messages", label: "Messages", icon: FileClock, requiresWrite: false, summary: "Payload inspection, archival, and runtime outcomes." },
  { href: "/simulator", label: "Simulator", icon: FlaskConical, requiresWrite: true, summary: "Inject controlled traffic through active MedFlow lanes." },
  { href: "/transformations", label: "Transformations", icon: ArrowRightLeft, requiresWrite: false, summary: "Scripted data-shaping logic across source and destination lanes." },
  { href: "/validation-rules", label: "Validation", icon: ShieldCheck, requiresWrite: false, summary: "Schema, required-field, and format enforcement surfaces." },
  { href: "/routing-rules", label: "Routing", icon: GitBranch, requiresWrite: false, summary: "Traffic branching, filtering, duplication, and archival rules." },
  { href: "/connectors", label: "Connectors", icon: Cable, requiresWrite: false, summary: "Endpoint reachability, protocol posture, and connection testing." },
  { href: "/monitoring", label: "Monitoring", icon: Activity, requiresWrite: false, summary: "Telemetry windows, heatmaps, and pressure trends." },
  { href: "/alerts", label: "Alerts", icon: BellRing, requiresWrite: false, summary: "Threshold-driven escalations and delivery targets." },
  { href: "/errors", label: "Errors", icon: AlertTriangle, requiresWrite: false, summary: "Incident triage, resolution state, and lane-level fault context." },
  { href: "/audit", label: "Audit", icon: ScrollText, requiresWrite: false, summary: "Forensic timeline of operator and system activity." },
];

const roleToneMap = {
  admin: "warm",
  engineer: "good",
  viewer: "neutral",
} as const;

const roleCopy = {
  admin: "Full control",
  engineer: "Operational write access",
  viewer: "Read-only mode",
} as const;

export function DashboardShell({
  children,
  operator,
}: {
  children: React.ReactNode;
  operator: OperatorSummary | null;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [navOpen, setNavOpen] = useState(false);
  const role = operator?.role ?? "viewer";

  const activeItem = useMemo(
    () => navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0],
    [pathname],
  );

  return (
    <div className="app-grid min-h-screen px-3 py-3 lg:px-6">
      {navOpen ? <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-ink/35 backdrop-blur-sm lg:hidden" onClick={() => setNavOpen(false)} type="button" /> : null}
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className={cn(
          "fixed inset-y-3 left-3 z-40 w-[310px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,28,38,0.98),rgba(10,56,62,0.96)_42%,rgba(15,28,37,0.98)_100%)] px-5 py-6 text-white shadow-[0_32px_90px_rgba(8,18,24,0.35)] transition-transform duration-300 lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-[120%] lg:translate-x-0",
        )}>
          <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(121,211,196,0.18),transparent_58%)]" />
          <div className="relative space-y-6">
            <div className="flex items-start justify-between gap-4 lg:hidden">
              <div>
                <p className="display-face text-4xl leading-none text-white">MedFlow</p>
                <p className="mt-2 text-sm leading-6 text-white/64">Healthcare integration command shell</p>
              </div>
              <button aria-label="Close navigation" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white" onClick={() => setNavOpen(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Badge className="bg-white/10 text-white" tone="neutral">Healthcare integration engine</Badge>
              <div>
                <p className="display-face text-4xl leading-none text-white">MedFlow</p>
                <p className="mt-3 text-sm leading-6 text-white/68">
                  Modern operational control for HL7, FHIR, connector health, message reliability, and operator escalation.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/46">Active operator</p>
              <p className="mt-3 text-sm font-semibold text-white">{operator?.fullName ?? "Authenticated user"}</p>
              <p className="mt-1 text-sm leading-6 text-white/62">{operator?.email ?? "Session active"}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Badge className="bg-white/10 text-white" tone={roleToneMap[role]}>{role}</Badge>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/52">{roleCopy[role]}</span>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const disabled = item.requiresWrite && role === "viewer";

                if (disabled) {
                  return (
                    <div
                      key={item.href}
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/34"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      active ? "bg-white/12 text-white shadow-[0_18px_36px_rgba(8,18,24,0.2)]" : "text-white/74 hover:bg-white/7 hover:text-white",
                    )}
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Button
              aria-label="Log out"
              className="w-full border border-white/12 bg-white/8 text-white hover:bg-white/12"
              loading={pending}
              loadingText="Signing out..."
              variant="ghost"
              onClick={() => startTransition(async () => {
                await logoutAction();
                window.location.href = "/login";
              })}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="min-w-0 space-y-6 py-1">
          <header className="sticky top-3 z-20 overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,252,246,0.92),rgba(255,250,244,0.8))] px-4 py-4 shadow-[0_24px_60px_rgba(17,32,42,0.08)] backdrop-blur sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <button aria-label="Open navigation" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line-strong bg-white/84 text-ink lg:hidden" onClick={() => setNavOpen(true)} type="button">
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Current workspace</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">{activeItem.label}</p>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">{activeItem.summary}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <Badge tone="good">Protected session</Badge>
                <Badge tone={roleToneMap[role]}>{role}</Badge>
                <div className="rounded-full border border-line-strong bg-white/78 px-4 py-2 text-sm font-semibold text-muted">
                  {operator?.fullName ?? "Operator"}
                </div>
              </div>
            </div>
          </header>

          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}