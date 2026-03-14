"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--hb-snow)] hb-grid-bg relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_70%)] pointer-events-none" />

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative">
        <div className="hb-animate-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--hb-teal)] to-[var(--hb-teal-dim)] flex items-center justify-center hb-glow-teal">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-[var(--hb-text-primary)] tracking-tight font-[family-name:var(--font-ibm-plex)]">
              HealthBridge
            </span>
          </div>
          <p className="text-[var(--hb-text-ghost)] text-sm ml-[52px]">Healthcare Integration Engine</p>
        </div>

        <div className="space-y-8 max-w-md hb-animate-in hb-stagger-2">
          <div className="hb-ekg-line w-full" />

          <div className="space-y-6">
            {[
              { label: "HL7v2 / FHIR R4", desc: "Parse, transform, and route clinical messages in real-time" },
              { label: "Channel Engine", desc: "Visual workflow builder with source-filter-transform-destination pipeline" },
              { label: "Enterprise Ready", desc: "Message queuing, retry logic, audit trails, and role-based access" },
            ].map((item, i) => (
              <div key={i} className={`flex items-start gap-4 hb-animate-in hb-stagger-${i + 3}`}>
                <div className="w-8 h-8 rounded-lg bg-[var(--hb-teal-ghost)] border border-[var(--hb-teal)]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--hb-teal)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)]">{item.label}</p>
                  <p className="text-sm text-[var(--hb-text-tertiary)] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hb-ekg-line w-full" />
        </div>

        <p className="text-[10px] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] uppercase tracking-[0.2em] hb-animate-in hb-stagger-6">
          Interoperability Platform v1.0
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 lg:max-w-[520px] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px] hb-animate-in-scale">
          <div className="hb-panel-elevated p-8 relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--hb-teal)] to-transparent opacity-50" />

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--hb-teal)] to-[var(--hb-teal-dim)] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-[var(--hb-text-primary)]">HealthBridge</span>
            </div>

            <div className="mb-8">
              <h1 className="text-xl font-bold text-[var(--hb-text-primary)] mb-1">Welcome back</h1>
              <p className="text-sm text-[var(--hb-text-tertiary)]">Sign in to your integration engine</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-[var(--hb-text-tertiary)] uppercase tracking-[0.15em] mb-2 font-[family-name:var(--font-jetbrains)]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="hb-input w-full"
                  placeholder="operator@hospital.org"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--hb-text-tertiary)] uppercase tracking-[0.15em] mb-2 font-[family-name:var(--font-jetbrains)]">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="hb-input w-full"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-[var(--hb-red)] flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="hb-btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[var(--hb-border)]" />
              <span className="text-[10px] text-[var(--hb-text-ghost)] uppercase tracking-widest font-[family-name:var(--font-jetbrains)]">or</span>
              <div className="h-px flex-1 bg-[var(--hb-border)]" />
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                  },
                });
              }}
              className="hb-btn-ghost w-full flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm">Continue with Google</span>
            </button>

            <p className="mt-6 text-center text-sm text-[var(--hb-text-tertiary)]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[var(--hb-teal)] hover:text-[var(--hb-teal-dim)] font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
