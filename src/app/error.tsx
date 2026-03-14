"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-xl p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-alert">System fault</p>
        <h2 className="display-face mt-4 text-5xl text-ink">MedFlow hit an unexpected state.</h2>
        <p className="mt-4 text-sm leading-6 text-muted">{error.message}</p>
        <Button aria-label="Retry rendering" className="mt-6" onClick={reset}>Try again</Button>
      </Card>
    </div>
  );
}

