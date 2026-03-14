import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-xl p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Not found</p>
        <h1 className="display-face mt-4 text-5xl text-ink">This route does not exist in MedFlow.</h1>
        <p className="mt-4 text-sm leading-6 text-muted">The requested workspace page was not found or no longer exists.</p>
        <Link className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white" href="/dashboard">Back to dashboard</Link>
      </Card>
    </div>
  );
}

