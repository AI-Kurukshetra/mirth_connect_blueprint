import type { ChannelRow, ConnectorRow, ErrorLogRow, MessageRow, MetricRow } from "@/types/database";

export interface MonitoringSummary {
  connectorReadiness: number;
  openIncidents: number;
  queueDepth: number;
  successRate: number;
  windowP95Latency: number | null;
  windowP99Latency: number | null;
}

export interface MonitoringHeatmapCell {
  intensity: number;
  label: string;
  value: number | null;
  valueLabel: string;
}

export interface MonitoringHeatmapRow {
  cells: MonitoringHeatmapCell[];
  kind: "good-high" | "bad-high" | "neutral-high";
  label: string;
}

export interface ChannelHealthRow {
  averageLatencyMs: number | null;
  channelId: string;
  endpointReadiness: number;
  failureRate: number;
  healthScore: number;
  messageFormat: string;
  name: string;
  openIncidents: number;
  recentVolume: number;
  status: ChannelRow["status"];
  transportLabel: string;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function toHourLabel(recordedAt: string) {
  return new Date(recordedAt).toLocaleTimeString("en-US", { hour: "numeric" });
}

export function computePercentile(values: Array<number | null | undefined>, percentile: number) {
  const sorted = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((left, right) => left - right);

  if (sorted.length === 0) {
    return null;
  }

  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[clamp(index, 0, sorted.length - 1)];
}

function toIntensity(values: Array<number | null | undefined>, current: number | null) {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (numeric.length === 0 || current === null || !Number.isFinite(current)) {
    return 0.12;
  }

  const minimum = Math.min(...numeric);
  const maximum = Math.max(...numeric);

  if (maximum === minimum) {
    return 0.55;
  }

  return clamp((current - minimum) / (maximum - minimum), 0.08, 1);
}

function average(values: Array<number | null | undefined>) {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (numeric.length === 0) {
    return null;
  }

  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

export function buildMonitoringSummary(metrics: MetricRow[], connectors: ConnectorRow[], messages: MessageRow[], errors: ErrorLogRow[]): MonitoringSummary {
  const latestMetric = metrics.at(-1);
  const connectorReadiness = connectors.length > 0
    ? round((connectors.filter((connector) => connector.status === "connected").length / connectors.length) * 100)
    : 0;
  const queueDepth = messages.filter((message) => ["queued", "retrying", "pending"].includes(message.status)).length;
  const successRate = latestMetric && latestMetric.messages_total > 0
    ? round((latestMetric.messages_success / latestMetric.messages_total) * 100)
    : 0;

  return {
    connectorReadiness,
    openIncidents: errors.filter((error) => !error.resolved).length,
    queueDepth,
    successRate,
    windowP95Latency: computePercentile(metrics.map((metric) => metric.avg_latency_ms), 95),
    windowP99Latency: computePercentile(metrics.map((metric) => metric.avg_latency_ms), 99),
  };
}

export function buildMonitoringHeatmap(metrics: MetricRow[]): MonitoringHeatmapRow[] {
  const throughputValues = metrics.map((metric) => metric.throughput_per_min);
  const successRateValues = metrics.map((metric) => metric.messages_total > 0 ? (metric.messages_success / metric.messages_total) * 100 : 0);
  const failureRateValues = metrics.map((metric) => metric.messages_total > 0 ? (metric.messages_failed / metric.messages_total) * 100 : 0);
  const latencyValues = metrics.map((metric) => metric.avg_latency_ms);
  const cpuValues = metrics.map((metric) => metric.cpu_usage_pct);
  const memoryValues = metrics.map((metric) => metric.memory_usage_pct);

  return [
    {
      kind: "good-high",
      label: "Throughput",
      cells: metrics.map((metric, index) => ({
        intensity: toIntensity(throughputValues, metric.throughput_per_min),
        label: toHourLabel(metric.recorded_at),
        value: metric.throughput_per_min,
        valueLabel: metric.throughput_per_min !== null ? `${round(metric.throughput_per_min)} msg/min` : "n/a",
      })),
    },
    {
      kind: "good-high",
      label: "Success %",
      cells: metrics.map((metric, index) => {
        const value = successRateValues[index] ?? null;
        return {
          intensity: toIntensity(successRateValues, value),
          label: toHourLabel(metric.recorded_at),
          value,
          valueLabel: value !== null ? `${round(value)}%` : "n/a",
        };
      }),
    },
    {
      kind: "bad-high",
      label: "Failure %",
      cells: metrics.map((metric, index) => {
        const value = failureRateValues[index] ?? null;
        return {
          intensity: toIntensity(failureRateValues, value),
          label: toHourLabel(metric.recorded_at),
          value,
          valueLabel: value !== null ? `${round(value)}%` : "n/a",
        };
      }),
    },
    {
      kind: "bad-high",
      label: "Latency",
      cells: metrics.map((metric) => ({
        intensity: toIntensity(latencyValues, metric.avg_latency_ms),
        label: toHourLabel(metric.recorded_at),
        value: metric.avg_latency_ms,
        valueLabel: metric.avg_latency_ms !== null ? `${round(metric.avg_latency_ms)} ms` : "n/a",
      })),
    },
    {
      kind: "bad-high",
      label: "CPU",
      cells: metrics.map((metric) => ({
        intensity: toIntensity(cpuValues, metric.cpu_usage_pct),
        label: toHourLabel(metric.recorded_at),
        value: metric.cpu_usage_pct,
        valueLabel: metric.cpu_usage_pct !== null ? `${round(metric.cpu_usage_pct)}%` : "n/a",
      })),
    },
    {
      kind: "bad-high",
      label: "Memory",
      cells: metrics.map((metric) => ({
        intensity: toIntensity(memoryValues, metric.memory_usage_pct),
        label: toHourLabel(metric.recorded_at),
        value: metric.memory_usage_pct,
        valueLabel: metric.memory_usage_pct !== null ? `${round(metric.memory_usage_pct)}%` : "n/a",
      })),
    },
  ];
}

export function buildChannelHealthRows(
  channels: ChannelRow[],
  connectors: ConnectorRow[],
  messages: MessageRow[],
  errors: ErrorLogRow[],
): ChannelHealthRow[] {
  return channels.map((channel) => {
    const channelMessages = messages.filter((message) => message.channel_id === channel.id);
    const channelErrors = errors.filter((error) => error.channel_id === channel.id && !error.resolved);
    const failedMessages = channelMessages.filter((message) => ["failed", "retrying", "error"].includes(message.status));
    const relatedConnectors = connectors.filter((connector) => connector.type === channel.source_type || connector.type === channel.destination_type);
    const endpointReadiness = relatedConnectors.length > 0
      ? round((relatedConnectors.filter((connector) => connector.status === "connected").length / relatedConnectors.length) * 100)
      : 0;
    const failureRate = channelMessages.length > 0 ? round((failedMessages.length / channelMessages.length) * 100) : 0;
    const averageLatencyMs = average(channelMessages.map((message) => message.processing_time_ms));

    let healthScore = 100;
    if (channel.status === "error") healthScore -= 42;
    if (channel.status === "paused") healthScore -= 18;
    if (channel.status === "inactive") healthScore -= 24;
    healthScore -= Math.min(channelErrors.length * 16, 36);
    healthScore -= Math.min(failureRate * 0.35, 28);
    healthScore -= Math.max(0, (100 - endpointReadiness) * 0.15);
    if (averageLatencyMs && averageLatencyMs > 80) healthScore -= Math.min((averageLatencyMs - 80) * 0.22, 18);

    return {
      averageLatencyMs: averageLatencyMs ? round(averageLatencyMs) : null,
      channelId: channel.channel_id,
      endpointReadiness: round(endpointReadiness),
      failureRate,
      healthScore: round(clamp(healthScore, 4, 100), 0),
      messageFormat: channel.message_format,
      name: channel.name,
      openIncidents: channelErrors.length,
      recentVolume: channelMessages.length,
      status: channel.status,
      transportLabel: `${channel.source_type} → ${channel.destination_type}`,
    };
  }).sort((left, right) => left.healthScore - right.healthScore || right.openIncidents - left.openIncidents);
}