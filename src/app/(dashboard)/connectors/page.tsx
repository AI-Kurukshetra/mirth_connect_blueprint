import Link from "next/link";

import { TestConnectorButton } from "@/components/connectors/test-connector-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAuthContext } from "@/lib/authz";
import { getConnectors } from "@/lib/data/medflow";
import { formatRelativeTime } from "@/lib/utils";

const toneMap = {
  connected: "good",
  disconnected: "gold",
  error: "warm",
  testing: "neutral",
} as const;

const ringMap = {
  connected: "border-mint/55 bg-mint/12 text-teal",
  disconnected: "border-gold/45 bg-gold/12 text-gold",
  error: "border-alert/45 bg-alert/10 text-alert",
  testing: "border-ink/18 bg-ink/5 text-ink",
} as const;

const signalScore = {
  connected: "96%",
  disconnected: "42%",
  error: "18%",
  testing: "71%",
} as const;

export default async function ConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; query?: string; status?: string; type?: string }>;
}) {
  const { permissions } = await getAuthContext();
  const { direction = "all", query = "", status = "all", type = "all" } = await searchParams;
  const connectors = await getConnectors();

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = connectors.filter((connector) => {
    const matchesDirection = direction === "all" || connector.direction === direction;
    const matchesStatus = status === "all" || connector.status === status;
    const matchesType = type === "all" || connector.type === type;
    const matchesQuery = !normalizedQuery || [
      connector.connector_id,
      connector.name,
      connector.host,
      connector.path_or_queue,
      connector.type,
      connector.auth_method,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));

    return matchesDirection && matchesStatus && matchesType && matchesQuery;
  });

  const healthyCount = connectors.filter((connector) => connector.status === "connected").length;
  const testingCount = connectors.filter((connector) => connector.status === "testing").length;
  const bidirectionalCount = connectors.filter((connector) => connector.direction === "bidirectional").length;
  const securedCount = connectors.filter((connector) => connector.auth_method && connector.auth_method !== "none").length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(17,32,42,0.98),rgba(17,32,42,0.92)_32%,rgba(0,116,122,0.92)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.18fr)_420px]">
          <div>
            <Badge className="bg-white/10 text-white" tone="neutral">Connector fabric</Badge>
            <h1 className="display-face mt-4 text-5xl text-white">Instrument every system edge before traffic hits the lane.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">Track transport type, auth posture, endpoint freshness, and current runtime state across every MedFlow connector.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="neutral">{connectors.length} total endpoints</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{healthyCount} green</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{securedCount} secured</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Healthy endpoints</p>
              <p className="mt-3 text-4xl font-semibold text-white">{healthyCount}</p>
              <p className="mt-2 text-sm text-white/68">Connectors reporting a clean last-known posture</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Testing now</p>
              <p className="mt-3 text-4xl font-semibold text-white">{testingCount}</p>
              <p className="mt-2 text-sm text-white/68">Endpoints staged for verification before live traffic resumes</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Bidirectional lanes</p>
              <p className="mt-3 text-4xl font-semibold text-white">{bidirectionalCount}</p>
              <p className="mt-2 text-sm text-white/68">Connectors carrying both request and response traffic</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]" method="get">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="query">Search</label>
              <Input defaultValue={query} id="query" name="query" placeholder="Search by connector ID, name, host, auth, or type" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="type">Type</label>
              <Select defaultValue={type} id="type" name="type">
                <option value="all">All types</option>
                <option value="MLLP">MLLP</option>
                <option value="HTTP">HTTP</option>
                <option value="SFTP">SFTP</option>
                <option value="TCP">TCP</option>
                <option value="Database">Database</option>
                <option value="REST">REST</option>
                <option value="SOAP">SOAP</option>
                <option value="File">File</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="direction">Direction</label>
              <Select defaultValue={direction} id="direction" name="direction">
                <option value="all">All directions</option>
                <option value="source">Source</option>
                <option value="destination">Destination</option>
                <option value="bidirectional">Bidirectional</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="status">Status</label>
              <Select defaultValue={status} id="status" name="status">
                <option value="all">All states</option>
                <option value="connected">Connected</option>
                <option value="testing">Testing</option>
                <option value="disconnected">Disconnected</option>
                <option value="error">Error</option>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <Button aria-label="Apply connector filters" type="submit">Apply</Button>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/connectors">Reset</Link>
            </div>
          </form>
          {permissions.canCreate ? (
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href="/connectors/add">
              Add connector
            </Link>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-2">
        {filtered.map((connector) => {
          const endpoint = connector.type === "File"
            ? (connector.path_or_queue ?? "Path pending")
            : `${connector.host ?? "Host pending"}${connector.port ? `:${connector.port}` : ""}`;

          return (
            <Card key={connector.id} className="overflow-hidden p-0">
              <div className="border-b border-line/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(225,253,248,0.58))] px-6 py-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={toneMap[connector.status]}>{connector.status}</Badge>
                      <Badge tone="neutral">{connector.type}</Badge>
                      <Badge tone="gold">{connector.direction}</Badge>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-ink">{connector.name}</h2>
                    <p className="mt-2 text-sm uppercase tracking-[0.18em] text-muted">{connector.connector_id}</p>
                    <p className="mt-4 text-sm leading-7 text-muted">{endpoint}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    {permissions.canEdit ? <TestConnectorButton connectorId={connector.connector_id} variant="secondary" /> : null}
                    {permissions.canEdit ? (
                      <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/82 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/connectors/${connector.connector_id}/edit`}>
                        Open editor
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="grid gap-5 px-6 py-5 xl:grid-cols-[250px_minmax(0,1fr)]">
                <div className="rounded-[26px] border border-line-strong bg-white/78 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Signal posture</p>
                      <p className="mt-2 text-3xl font-semibold text-ink">{signalScore[connector.status]}</p>
                      <p className="mt-2 text-sm text-muted">Last-mile confidence based on current runtime state</p>
                    </div>
                    <div className={`flex h-20 w-20 items-center justify-center rounded-full border-[10px] ${ringMap[connector.status]}`}>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{connector.status}</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Endpoint</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{endpoint}</p>
                    <p className="mt-2 text-sm text-muted">{connector.path_or_queue ? `Path or queue: ${connector.path_or_queue}` : "No dedicated path or queue set."}</p>
                  </div>
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Auth</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{connector.auth_method ?? "none"}</p>
                    <p className="mt-2 text-sm text-muted">Use explicit auth modes so production posture is auditable.</p>
                  </div>
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4 sm:col-span-2 xl:col-span-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Last probe</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{connector.last_ping ? formatRelativeTime(connector.last_ping) : "Not tested yet"}</p>
                    <p className="mt-2 text-sm text-muted">Run a probe after editing host, auth, or queue details.</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">No connectors found</p>
          <p className="mt-3 text-base leading-7 text-muted">Adjust the filters or add a new endpoint to start wiring downstream systems.</p>
        </Card>
      ) : null}
    </div>
  );
}