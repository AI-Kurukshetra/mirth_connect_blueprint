import { notFound, redirect } from "next/navigation";

import { ConnectorForm } from "@/components/connectors/connector-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getConnector } from "@/lib/data/medflow";
import type { ConnectorInput } from "@/lib/validations/connector";
import { formatRelativeTime } from "@/lib/utils";

export default async function EditConnectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await getAuthContext();
  const connector = await getConnector(id);

  if (!connector) {
    notFound();
  }

  if (!permissions.canEdit) {
    redirect("/connectors");
  }

  const initialValues: ConnectorInput = {
    connectorId: connector.connector_id,
    name: connector.name,
    type: connector.type as ConnectorInput["type"],
    direction: connector.direction,
    host: connector.host ?? "",
    port: connector.port ?? Number.NaN,
    pathOrQueue: connector.path_or_queue ?? "",
    authMethod: (connector.auth_method ?? "none") as ConnectorInput["authMethod"],
    status: connector.status,
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone={connector.status === "connected" ? "good" : connector.status === "error" ? "warm" : connector.status === "disconnected" ? "gold" : "neutral"}>{connector.status} endpoint</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Tune {connector.connector_id}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Adjust transport details, auth posture, and target coordinates before re-testing the live edge.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="neutral">{connector.type}</Badge>
            <Badge tone="gold">{connector.direction}</Badge>
            <Badge tone="good">{connector.last_ping ? `tested ${formatRelativeTime(connector.last_ping)}` : "awaiting first probe"}</Badge>
          </div>
        </div>
      </Card>
      <ConnectorForm currentConnectorId={connector.connector_id} initialValues={initialValues} mode="edit" />
    </div>
  );
}