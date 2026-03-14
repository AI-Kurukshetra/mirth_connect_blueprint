"use client";

import type { ReactNode } from "react";
import NextTopLoader from "nextjs-toploader";
import { LoaderCircle } from "lucide-react";
import { Toaster } from "sonner";

import { useUiStore } from "@/store/ui-store";

function GlobalOverlay() {
  const loadingLabel = useUiStore((state) => state.loadingLabel);

  if (!loadingLabel) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/28 backdrop-blur-sm">
      <div className="glass flex items-center gap-3 rounded-full border border-white/60 px-6 py-4 text-sm font-semibold text-ink shadow-[0_30px_90px_rgba(17,32,42,0.18)]">
        <LoaderCircle className="h-5 w-5 animate-spin text-teal" />
        {loadingLabel}
      </div>
    </div>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <NextTopLoader color="#0f6d69" showSpinner={false} />
      {children}
      <GlobalOverlay />
      <Toaster richColors position="top-right" />
    </>
  );
}

