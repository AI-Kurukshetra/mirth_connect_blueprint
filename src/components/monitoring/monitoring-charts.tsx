"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { buildChannelHealthRows, buildMonitoringHeatmap, buildMonitoringSummary } from "@/lib/monitoring";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ChannelRow, ConnectorRow, ErrorLogRow, MessageRow, MetricRow } from "@/types/database";

const statusToneMap = {
  active: "good",
  paused: "gold",
  inactive: "neutral",
  error: "warm",
} as const;

const heatmapToneMap = {
  "good-high": "rgba(121, 211, 196, %INTENSITY%)",
  "bad-high": "rgba(207, 106, 65, %INTENSITY%)",
  "neutral-high": "rgba(182, 132, 47, %INTENSITY%)",
} as const;

function toneForScore(score: number) {
  if (score >= 80) return "good" as const;
  if (score >= 55) return "gold" as const;
  return "warm" as const;
}

function scoreRing(score: number) {
  if (score >= 80) return "border-mint/55 bg-mint/12 text-teal";
  if (score >= 55) return "border-gold/45 bg-gold/12 text-gold";
  return "border-alert/45 bg-alert/10 text-alert";
}

function formatValue(value: number | null, suffix: string, digits = 1) {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

export function MonitoringCharts({
  channels,
  connectors,
  errors,
  messages,
  metrics,
}: {
  channels: ChannelRow[];
  connectors: ConnectorRow[];
  errors: ErrorLogRow[];
  messages: MessageRow[];
  metrics: MetricRow[];
}) {
  const router = useRouter();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState("45");
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date().toISOString());
  const [isPending, startTransition] = useTransition();

  const summary = buildMonitoringSummary(metrics, connectors, messages, errors);
  const heatmap = buildMonitoringHeatmap(metrics);
  const channelHealth = buildChannelHealthRows(channels, connectors, messages, errors);
  const latestMetric = metrics.at(-1) ?? null;
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]));
  const unresolvedIncidents = errors
    .filter((error) => !error.resolved)
    .slice(0, 5)
    .map((error) => ({
      ...error,
      channel: error.channel_id ? channelMap.get(error.channel_id) ?? null : null,
    }));
  const chartData = metrics.map((metric) => ({
    cpu: metric.cpu_usage_pct,
    failureRate: metric.messages_total > 0 ? (metric.messages_failed / metric.messages_total) * 100 : 0,
    label: new Date(metric.recorded_at).toLocaleTimeString("en-US", { hour: "numeric" }),
    latency: metric.avg_latency_ms,
    memory: metric.memory_usage_pct,
    successRate: metric.messages_total > 0 ? (metric.messages_success / metric.messages_total) * 100 : 0,
    throughput: metric.throughput_per_min,
  }));

  const triggerRefresh = useEffectEvent(() => {
    setLastRefreshAt(new Date().toISOString());
    startTransition(() => {
      router.refresh();
    });
  });

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const timer = window.setInterval(() => {
      triggerRefresh();
    }, Number(intervalSeconds) * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoRefresh, intervalSeconds, triggerRefresh]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(17,32,42,0.98),rgba(17,32,42,0.92)_32%,rgba(0,116,122,0.92)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.18fr)_430px]">
          <div>
            <Badge className="bg-white/10 text-white" tone="neutral">Live telemetry</Badge>
            <h1 className="display-face mt-4 text-5xl text-white sm:text-6xl">Monitor reliability before operators feel the drift.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">Track tail latency, queue pressure, compute saturation, and per-channel health across the active MedFlow estate.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/80">
                <span className={cn("hb-status-pulse h-2.5 w-2.5 rounded-full bg-mint", autoRefresh ? "opacity-100" : "opacity-35")} />
                {autoRefresh ? `Auto-refresh every ${intervalSeconds}s` : "Manual refresh mode"}
              </span>
              <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/80">
                Last metric {latestMetric ? formatRelativeTime(latestMetric.recorded_at) : "not available"}
              </span>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Refresh controls</p>
                <p className="mt-3 text-sm leading-6 text-white/74">Keep the board live during ops review or freeze it while investigating a single spike.</p>
              </div>
              <Badge className="bg-white/12 text-white" tone="neutral">{isPending ? "refreshing" : "synced"}</Badge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <button
                aria-pressed={autoRefresh}
                className={cn(
                  "flex items-center justify-between rounded-[24px] border px-4 py-3 text-left text-sm font-semibold",
                  autoRefresh ? "border-mint/45 bg-mint/12 text-white" : "border-white/12 bg-white/6 text-white/72",
                )}
                type="button"
                onClick={() => setAutoRefresh((current) => !current)}
              >
                <span>{autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}</span>
                <span className={cn("h-2.5 w-2.5 rounded-full", autoRefresh ? "bg-mint" : "bg-white/35")} />
              </button>
              <div>
                <Select aria-label="Refresh interval" className="border-white/18 bg-white/8 text-white [&>option]:text-ink" value={intervalSeconds} onChange={(event) => setIntervalSeconds(event.target.value)}>
                  <option value="20">20 seconds</option>
                  <option value="45">45 seconds</option>
                  <option value="90">90 seconds</option>
                </Select>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button loading={isPending} loadingText="Refreshing..." type="button" variant="secondary" onClick={() => triggerRefresh()}>
                Refresh now
              </Button>
              <p className="text-sm text-white/62">Board refresh triggered {formatRelativeTime(lastRefreshAt)}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { detail: "Observed latency across recorded windows", label: "Window p95", value: formatValue(summary.windowP95Latency, " ms") },
          { detail: "Upper-tail latency estimate from current telemetry", label: "Window p99", value: formatValue(summary.windowP99Latency, " ms") },
          { detail: `${latestMetric?.messages_success ?? 0} success / ${latestMetric?.messages_failed ?? 0} failed`, label: "Success rate", value: formatValue(summary.successRate, "%", 0) },
          { detail: "Queued, retrying, or pending messages", label: "Queue pressure", value: String(summary.queueDepth) },
          { detail: `${summary.openIncidents} unresolved incident${summary.openIncidents === 1 ? "" : "s"}`, label: "Connector readiness", value: formatValue(summary.connectorReadiness, "%", 0) },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{item.label}</p>
            <p className="mt-4 text-4xl font-semibold text-ink">{item.value}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line/70 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Delivery envelope</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Throughput against delivery quality</h2>
          </div>
          <div className="px-3 pb-4 pt-2 sm:px-6 sm:pb-6">
            <div className="h-80">
              <ResponsiveContainer height="100%" width="100%">
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="monitor-throughput" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0f6d69" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0f6d69" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(17,32,42,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#5f6d76" tickLine={false} />
                  <YAxis stroke="#5f6d76" tickLine={false} width={44} yAxisId="left" />
                  <YAxis orientation="right" stroke="#5f6d76" tickFormatter={(value) => `${value}%`} tickLine={false} width={48} yAxisId="right" />
                  <Tooltip />
                  <Area dataKey="throughput" fill="url(#monitor-throughput)" stroke="#0f6d69" strokeWidth={3} yAxisId="left" />
                  <Line dataKey="successRate" dot={false} stroke="#79d3c4" strokeWidth={2.5} yAxisId="right" />
                  <Line dataKey="failureRate" dot={false} stroke="#cf6a41" strokeWidth={2.5} yAxisId="right" />
                  <ReferenceLine label="5% fail" stroke="rgba(207,106,65,0.3)" strokeDasharray="5 5" y={5} yAxisId="right" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-line/70 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Compute envelope</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Latency, CPU, and memory trend line</h2>
          </div>
          <div className="px-3 pb-4 pt-2 sm:px-6 sm:pb-6">
            <div className="h-80">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(17,32,42,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#5f6d76" tickLine={false} />
                  <YAxis stroke="#5f6d76" tickLine={false} width={44} />
                  <Tooltip />
                  <Line dataKey="latency" dot={false} stroke="#cf6a41" strokeWidth={2.8} />
                  <Line dataKey="cpu" dot={false} stroke="#0f6d69" strokeWidth={2.4} />
                  <Line dataKey="memory" dot={false} stroke="#b6842f" strokeWidth={2.4} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line/70 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Pressure matrix</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Window-by-window heatmap</h2>
          </div>
          <div className="space-y-3 px-6 py-6">
            {heatmap.map((row) => (
              <div key={row.label} className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-ink">{row.label}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {row.cells.map((cell) => (
                    <div
                      key={`${row.label}-${cell.label}`}
                      className="rounded-[18px] border border-line/70 px-3 py-3 text-center"
                      style={{ backgroundColor: heatmapToneMap[row.kind].replace("%INTENSITY%", String(0.18 + cell.intensity * 0.58)) }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/65">{cell.label}</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{cell.valueLabel}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line/70 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Incident watchlist</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Unresolved operator alerts</h2>
            </div>
            <Link className="text-sm font-semibold text-teal hover:text-ink" href="/errors">See all</Link>
          </div>
          <div className="divide-y divide-line/70">
            {unresolvedIncidents.length > 0 ? unresolvedIncidents.map((incident) => (
              <Link key={incident.id} className="block px-6 py-4 hover:bg-white/68" href="/errors">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warm">{incident.error_type}</Badge>
                      {incident.channel ? <Badge tone={statusToneMap[incident.channel.status]}>{incident.channel.channel_id}</Badge> : null}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink">{incident.error_message}</p>
                    <p className="mt-2 text-sm text-muted">{incident.channel?.name ?? "Unassigned lane"}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{formatRelativeTime(incident.created_at)}</span>
                </div>
              </Link>
            )) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">No unresolved incidents</p>
                <p className="mt-3 text-sm leading-7 text-muted">Current telemetry is clean. Keep auto-refresh enabled during active deployment windows.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-line/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Channel health</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Lane-by-lane operational posture</h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="good">{channelHealth.filter((row) => row.healthScore >= 80).length} healthy</Badge>
            <Badge tone="gold">{channelHealth.filter((row) => row.healthScore >= 55 && row.healthScore < 80).length} warning</Badge>
            <Badge tone="warm">{channelHealth.filter((row) => row.healthScore < 55).length} critical</Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                <th className="border-b border-line/70 px-6 py-4">Lane</th>
                <th className="border-b border-line/70 px-4 py-4">Health</th>
                <th className="border-b border-line/70 px-4 py-4">Transport</th>
                <th className="border-b border-line/70 px-4 py-4">Messages</th>
                <th className="border-b border-line/70 px-4 py-4">Failure rate</th>
                <th className="border-b border-line/70 px-4 py-4">Latency</th>
                <th className="border-b border-line/70 px-4 py-4">Endpoints</th>
                <th className="border-b border-line/70 px-4 py-4">Open incidents</th>
                <th className="border-b border-line/70 px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {channelHealth.map((row) => (
                <tr key={row.channelId} className="hover:bg-white/56">
                  <td className="border-b border-line/60 px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={cn("flex h-14 w-14 items-center justify-center rounded-full border-[10px]", scoreRing(row.healthScore))}>
                        <span className="text-xs font-semibold">{row.healthScore}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link className="text-sm font-semibold text-ink hover:text-teal" href={`/channels/${row.channelId}`}>{row.name}</Link>
                          <Badge tone={statusToneMap[row.status]}>{row.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{row.channelId} / {row.messageFormat}</p>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-line/60 px-4 py-4">
                    <Badge tone={toneForScore(row.healthScore)}>{row.healthScore >= 80 ? "stable" : row.healthScore >= 55 ? "watch" : "critical"}</Badge>
                  </td>
                  <td className="border-b border-line/60 px-4 py-4 text-sm text-muted">{row.transportLabel}</td>
                  <td className="border-b border-line/60 px-4 py-4 text-sm font-semibold text-ink">{row.recentVolume}</td>
                  <td className="border-b border-line/60 px-4 py-4 text-sm text-muted">{row.failureRate.toFixed(1)}%</td>
                  <td className="border-b border-line/60 px-4 py-4 text-sm text-muted">{row.averageLatencyMs !== null ? `${row.averageLatencyMs.toFixed(1)} ms` : "n/a"}</td>
                  <td className="border-b border-line/60 px-4 py-4 text-sm text-muted">{row.endpointReadiness.toFixed(0)}%</td>
                  <td className="border-b border-line/60 px-4 py-4 text-sm font-semibold text-ink">{row.openIncidents}</td>
                  <td className="border-b border-line/60 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link className="text-sm font-semibold text-teal hover:text-ink" href={`/channels/${row.channelId}`}>Open channel</Link>
                      <Link className="text-sm font-semibold text-muted hover:text-ink" href="/messages">Messages</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}