import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV_SECTIONS = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
      { label: "Channels", href: "/channels", icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" },
      { label: "Messages", href: "/messages", icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" },
      { label: "Queue", href: "/queue", icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" },
    ],
  },
  {
    title: "Data",
    items: [
      { label: "FHIR Resources", href: "/fhir", icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" },
      { label: "Transformations", href: "/transformations", icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" },
      { label: "Code Templates", href: "/code-templates", icon: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Alerts", href: "/alerts", icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" },
      { label: "Audit Log", href: "/audit", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" },
      { label: "Settings", href: "/settings", icon: "M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z", icon2: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    ],
  },
];

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-[var(--hb-snow)]">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="w-[260px] bg-[var(--hb-white)] border-r border-[var(--hb-border)] flex flex-col relative shadow-[1px_0_8px_rgba(0,0,0,0.03)]">
        {/* Left edge accent */}
        <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--hb-teal)] via-[var(--hb-teal)]/20 to-transparent" />

        {/* Logo */}
        <div className="h-[60px] flex items-center gap-3 px-5 border-b border-[var(--hb-border)]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--hb-teal)] to-[var(--hb-teal-dim)] flex items-center justify-center shadow-[0_2px_8px_rgba(13,148,136,0.3)]">
            <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <div>
            <span className="text-[15px] font-bold text-[var(--hb-text-primary)] tracking-tight block leading-none">HealthBridge</span>
            <span className="text-[9px] text-[var(--hb-text-ghost)] uppercase tracking-[0.15em] font-[family-name:var(--font-jetbrains)]">Integration Engine</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-5 mb-1.5 text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)]">
                {section.title}
              </p>
              <div className="px-2.5 space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-snow)] transition-all duration-150 relative"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 rounded-full bg-[var(--hb-teal)] group-hover:h-4 transition-all duration-200" />
                    <svg className="w-[18px] h-[18px] shrink-0 text-[var(--hb-text-ghost)] group-hover:text-[var(--hb-teal)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      {"icon2" in item && item.icon2 && <path strokeLinecap="round" strokeLinejoin="round" d={item.icon2 as string} />}
                    </svg>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* EKG decoration */}
        <div className="mx-5 hb-ekg-line mb-4" />

        {/* User */}
        <div className="px-4 py-3.5 border-t border-[var(--hb-border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--hb-teal)]/15 to-[var(--hb-blue)]/10 border border-[var(--hb-teal)]/15 flex items-center justify-center text-[var(--hb-teal)] text-xs font-bold font-[family-name:var(--font-jetbrains)]">
              {user.email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[var(--hb-text-primary)] truncate">{user.email}</p>
              <p className="text-[10px] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-[48px] bg-[var(--hb-white)]/80 backdrop-blur-lg border-b border-[var(--hb-border)] flex items-center justify-between px-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--hb-text-ghost)] uppercase tracking-[0.15em] font-[family-name:var(--font-jetbrains)]">
              Healthcare Integration Engine
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--hb-green)] opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--hb-green)]" />
              </span>
              <span className="text-[11px] text-[var(--hb-text-tertiary)] font-[family-name:var(--font-jetbrains)]">System Online</span>
            </div>
            <div className="w-px h-4 bg-[var(--hb-border)]" />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-[11px] text-[var(--hb-text-tertiary)] hover:text-[var(--hb-teal)] transition-colors cursor-pointer font-[family-name:var(--font-jetbrains)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[var(--hb-snow)] hb-grid-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
