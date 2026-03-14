import Link from "next/link";

import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Login</p>
      <h2 className="display-face mt-4 text-5xl text-ink">Enter the MedFlow control room.</h2>
      <p className="mt-4 text-sm leading-6 text-muted">Use your workspace account to access the live healthcare operations surface.</p>
      <div className="mt-8"><LoginForm /></div>
      <p className="mt-6 text-sm text-muted">Need a workspace? <Link className="font-semibold text-teal" href="/signup">Create one</Link></p>
    </Card>
  );
}

