import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--hb-snow)] hb-grid-bg relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="text-center hb-animate-in-scale">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--hb-teal)] to-[var(--hb-teal-dim)] flex items-center justify-center hb-glow-teal">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-[var(--hb-text-primary)] mb-2">HealthBridge</h1>
        <p className="text-[var(--hb-text-tertiary)] mb-8 text-sm">Healthcare Integration Engine</p>

        <div className="hb-ekg-line w-48 mx-auto mb-8" />

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="hb-btn-primary px-8 py-2.5"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="hb-btn-ghost px-8 py-2.5"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
