import { redirect } from "next/navigation";

import { AlertForm } from "@/components/alerts/alert-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";

export default async function AddAlertPage() {
  const { permissions } = await getAuthContext();

  if (!permissions.canCreate) {
    redirect("/alerts");
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="gold">Create alert</Badge>
        <h1 className="display-face mt-4 text-5xl text-ink">Stand up a new escalation rule.</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Define the trigger family, delivery target, and cooldown contract that will page the right operator at the right time.</p>
      </Card>
      <AlertForm />
    </div>
  );
}