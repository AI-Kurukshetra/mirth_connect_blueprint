"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, AlertTriangle, Cable, FileClock, LayoutDashboard, LogOut, Network, ScrollText } from "lucide-react";
import { useTransition } from "react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/channels", label: "Channels", icon: Network },
  { href: "/messages", label: "Messages", icon: FileClock },
  { href: "/connectors", label: "Connectors", icon: Cable },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
  { href: "/errors", label: "Errors", icon: AlertTriangle },
  { href: "/audit", label: "Audit", icon: ScrollText },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div className="app-grid min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="glass rounded-[34px] border border-white/65 px-5 py-6 shadow-[0_30px_90px_rgba(17,32,42,0.08)]">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge tone="good">Healthcare integration engine</Badge>
              <div>
                <p className="display-face text-4xl leading-none text-ink">MedFlow</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Modern operational control for HL7, FHIR, connector health, and message reliability.
                </p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold",
                      active ? "bg-ink text-white shadow-[0_18px_36px_rgba(17,32,42,0.18)]" : "text-ink/80 hover:bg-white/70",
                    )}
                    href={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="rounded-[28px] border border-line-strong bg-white/74 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Deployment target</p>
              <p className="mt-3 text-sm leading-6 text-ink">GitHub repo: AI-Kurukshetra/mirth_connect_blueprint</p>
            </div>

            <Button
              aria-label="Log out"
              className="w-full"
              loading={pending}
              loadingText="Signing out..."
              variant="secondary"
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

        <main className="space-y-6 py-1">{children}</main>
      </div>
    </div>
  );
}

