import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getConnectors } from "@/lib/data/medflow";

const toneMap = {
  connected: "good",
  disconnected: "gold",
  error: "warm",
  testing: "neutral",
} as const;

export default async function ConnectorsPage() {
  const connectors = await getConnectors();

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h1 className="display-face text-5xl text-ink">Connectors</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Track inbound and outbound systems, auth modes, host targets, and last-known health.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {connectors.map((connector) => (
          <Card key={connector.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-ink">{connector.name}</p>
                <p className="mt-1 text-sm text-muted">{connector.connector_id} - {connector.direction}</p>
              </div>
              <Badge tone={toneMap[connector.status]}>{connector.status}</Badge>
            </div>
            <div className="mt-5 space-y-2 text-sm text-muted">
              <p>{connector.type} on {connector.host}:{connector.port}</p>
              <p>Auth: {connector.auth_method ?? "none"}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

