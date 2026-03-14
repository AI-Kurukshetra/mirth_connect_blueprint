import Link from "next/link";
import { AlertTriangle, ArrowRight, Gauge, ShieldCheck, Waves } from "lucide-react";

import { ChannelHealthRing } from "@/components/channels/channel-health-ring";
import { MessageVolumeChart } from "@/components/dashboard/message-volume-chart";
import { RecentMessages } from "@/components/dashboard/recent-messages";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buildChannelHealthRows, buildMonitoringHeatmap, buildMonitoringSummary } from "@/lib/monitoring";
import { getChannels, getConnectors, getErrorLogs, getMessages, getMetrics } from "@/lib/data/medflow";
import { describeChannelHealth } from "@/lib/channels";
import { compactNumber, formatRelativeTime } from "@/lib/utils";

const heatmapToneClasses = {
  "bad-high": ["bg-alert/10", "bg-alert/18", "bg-alert/28", "bg-alert/38"],
  "good-high": ["bg-teal/10", "bg-teal/18", "bg-teal/28", "bg-teal/38"],
  "neutral-high": ["bg-ink/6", "bg-ink/10", "bg-ink/14", "bg-ink/18"],
} as const;

function heatCellClass(kind: keyof typeof heatmapToneClasses, intensity: number) {
  if (intensity >= 0.82) return heatmapToneClasses[kind][3];
  if (intensity >= 0.58) return heatmapToneClasses[kind][2];
  if (intensity >= 0.32) return heatmapToneClasses[kind][1];
  return heatmapToneClasses[kind][0];
}

export default async function DashboardPage() {
  const [channels, connectors, messages, errors, metrics] = await Promise.all([
    getChannels(),
    getConnectors(),
    getMessages(),
    getErrorLogs(),
    getMetrics(),
  ]);

  const summary = buildMonitoringSummary(metrics, connectors, messages, errors);
  const heatmap = buildMonitoringHeatmap(metrics);
  const channelHealth = buildChannelHealthRows(channels, connectors, messages, errors).slice(0, 4);
  const unresolvedIncidents = errors.filter((error) => !error.resolved).slice(0, 4);
  const latestMetric = metrics.at(-1);

  const stats = [
    {
      detail: `${latestMetric?.messages_success ?? 0} succeeded / ${latestMetric?.messages_failed ?? 0} failed`,
      label: "Window traffic",
      value: compactNumber(latestMetric?.messages_total ?? 0),
    },
    {
      detail: `${summary.queueDepth} queued, retrying, or pending messages`,
      label: "Success rate",
      value: `${summary.successRate}%`,
    },
    {
      detail: `${summary.connectorReadiness}% endpoint readiness across configured connectors`,
      label: "Latency P95",
      value: summary.windowP95Latency !== null ? `${summary.windowP95Latency} ms` : "n/a",
    },
    {
      detail: `${summary.openIncidents} unresolved incidents need operator attention`,
      label: "Open incidents",
      value: String(summary.openIncidents),
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(145deg,rgba(10,24,32,0.98),rgba(15,72,80,0.94)_42%,rgba(147,168,94,0.9)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.22fr)_420px]">
          <div>
            <Badge className="bg-white/10 text-white" tone="neutral">Live operations snapshot</Badge>
            <h1 className="display-face mt-4 text-5xl text-white sm:text-6xl">MedFlow command center</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">
              Track traffic health, queue pressure, connector posture, and incident load from a single control-room surface built on the same MedFlow runtime data used across the app.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="neutral">{channels.length} lanes</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{connectors.length} connectors</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">Last sync {latestMetric ? formatRelativeTime(latestMetric.recorded_at) : "n/a"}</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Throughput</p>
              <p className="mt-3 text-4xl font-semibold text-white">{latestMetric?.throughput_per_min ?? 0}</p>
              <p className="mt-2 text-sm text-white/68">Messages per minute in the latest telemetry window.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Queue pressure</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.queueDepth}</p>
              <p className="mt-2 text-sm text-white/68">Queued, retrying, or pending messages still in flight.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Connector readiness</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.connectorReadiness}%</p>
              <p className="mt-2 text-sm text-white/68">Connected endpoints across the current MedFlow surface.</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatsCard key={stat.label} {...stat} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <MessageVolumeChart metrics={metrics} />
        <RecentMessages messages={messages.slice(0, 6)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(236,245,240,0.78))] px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Telemetry heatmap</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Pressure across the recent telemetry window</h2>
              </div>
              <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-ink" href="/monitoring">
                Open monitoring
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="space-y-4 p-6">
            {heatmap.map((row) => (
              <div key={row.label} className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-ink">{row.label}</p>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {row.cells.map((cell) => (
                    <div key={`${row.label}-${cell.label}`} className={`rounded-[18px] border border-line/60 px-3 py-3 ${heatCellClass(row.kind, cell.intensity)}`} title={`${cell.label} • ${cell.valueLabel}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{cell.label}</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{cell.valueLabel}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-line/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(236,245,240,0.78))] px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Lane watchlist</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">Channels needing the most attention</h2>
                </div>
                <Gauge className="h-5 w-5 text-teal" />
              </div>
            </div>
            <div className="space-y-4 p-6">
              {channelHealth.map((row) => {
                const descriptor = describeChannelHealth(row.healthScore);
                return (
                  <Link key={row.channelId} className="flex items-center gap-4 rounded-[24px] border border-line-strong bg-white/78 px-4 py-4 hover:-translate-y-0.5" href={`/channels/${row.channelId}`}>
                    <ChannelHealthRing score={row.healthScore} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-semibold text-ink">{row.channelId}</p>
                        <Badge tone={descriptor.tone}>{descriptor.label}</Badge>
                      </div>
                      <p className="mt-2 truncate text-sm text-muted">{row.name}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        <span>{row.openIncidents} incidents</span>
                        <span>{row.failureRate}% failure</span>
                        <span>{row.endpointReadiness}% ready</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-line/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,236,230,0.78))] px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Incident queue</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">Operator-critical issues</h2>
                </div>
                <AlertTriangle className="h-5 w-5 text-alert" />
              </div>
            </div>
            <div className="space-y-3 p-6">
              {unresolvedIncidents.length > 0 ? unresolvedIncidents.map((incident) => (
                <Link key={incident.id} className="block rounded-[22px] border border-line-strong bg-white/78 px-4 py-4 hover:-translate-y-0.5" href="/errors">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{incident.error_code}</p>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{formatRelativeTime(incident.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{incident.error_message}</p>
                </Link>
              )) : (
                <div className="rounded-[22px] border border-line-strong bg-[#f8f4ec] px-4 py-5 text-sm text-muted">No unresolved incidents are currently visible in the runtime ledger.</div>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link className="inline-flex h-10 items-center justify-center rounded-full border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30" href="/errors">Open errors</Link>
                <Link className="inline-flex h-10 items-center justify-center rounded-full border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30" href="/audit">Audit trail</Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}