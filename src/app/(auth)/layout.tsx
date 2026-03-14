import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass rounded-[34px] border border-white/65 p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Secure access</p>
          <h1 className="display-face mt-4 text-5xl leading-none text-ink sm:text-6xl">Healthcare integration without the legacy drag.</h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-muted">
            Sign in to manage channels, messages, connectors, and incidents. Supabase authentication,
            protected routes, and full loading states are wired into the app shell.
          </p>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

