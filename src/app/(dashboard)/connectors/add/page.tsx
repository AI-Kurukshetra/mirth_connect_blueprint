import { redirect } from "next/navigation";

import { ConnectorForm } from "@/components/connectors/connector-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";

export default async function AddConnectorPage() {
  const { permissions } = await getAuthContext();

  if (!permissions.canCreate) {
    redirect("/connectors");
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="gold">Create connector</Badge>
        <h1 className="display-face mt-4 text-5xl text-ink">Stand up a new system edge.</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Register the transport, security posture, and endpoint coordinates before testing the route from MedFlow.</p>
      </Card>
      <ConnectorForm />
    </div>
  );
}