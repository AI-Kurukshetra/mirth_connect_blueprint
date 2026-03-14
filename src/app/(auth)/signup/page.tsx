import Link from "next/link";

import { SignupForm } from "@/components/forms/signup-form";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card className="p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Create workspace</p>
      <h2 className="display-face mt-4 text-5xl text-ink">Start a MedFlow operator account.</h2>
      <p className="mt-4 text-sm leading-6 text-muted">This creates your Supabase-authenticated account and prepares your dashboard access.</p>
      <div className="mt-8"><SignupForm /></div>
      <p className="mt-6 text-sm text-muted">Already provisioned? <Link className="font-semibold text-teal" href="/login">Sign in</Link></p>
    </Card>
  );
}

