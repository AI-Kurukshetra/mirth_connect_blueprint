import type { ChannelRow, ConnectorRow, ErrorLogRow, MessageRow } from "@/types/database";

export type ChannelHealthLabel = "stable" | "watch" | "critical";

export interface ChannelRuntimeSnapshot {
  archived: number;
  averageLatencyMs: number | null;
  endpointReadiness: number;
  failed: number;
  inflight: number;
  lastMessageAt: string | null;
  openIncidents: number;
  processed: number;
  recentVolume: number;
  successRate: number;
}

export function describeChannelHealth(score: number): { label: ChannelHealthLabel; tone: "good" | "gold" | "warm" } {
  if (score >= 80) {
    return { label: "stable", tone: "good" as const };
  }

  if (score >= 55) {
    return { label: "watch", tone: "gold" as const };
  }

  return { label: "critical", tone: "warm" as const };
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function average(values: Array<number | null | undefined>) {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (numeric.length === 0) {
    return null;
  }

  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

export function buildChannelRuntimeSnapshot(
  channel: Pick<ChannelRow, "id" | "source_type" | "destination_type">,
  messages: MessageRow[],
  errors: ErrorLogRow[],
  connectors: ConnectorRow[],
): ChannelRuntimeSnapshot {
  const channelMessages = messages.filter((message) => message.channel_id === channel.id);
  const channelErrors = errors.filter((error) => error.channel_id === channel.id && !error.resolved);
  const failed = channelMessages.filter((message) => ["failed", "error"].includes(message.status)).length;
  const inflight = channelMessages.filter((message) => ["queued", "retrying", "pending"].includes(message.status)).length;
  const archived = channelMessages.filter((message) => message.status === "archived").length;
  const processed = channelMessages.filter((message) => ["processed", "sent", "received", "transformed", "filtered"].includes(message.status)).length;
  const relatedConnectors = connectors.filter((connector) => connector.type === channel.source_type || connector.type === channel.destination_type);
  const endpointReadiness = relatedConnectors.length > 0
    ? round((relatedConnectors.filter((connector) => connector.status === "connected").length / relatedConnectors.length) * 100)
    : 0;
  const averageLatencyMs = average(channelMessages.map((message) => message.processing_time_ms));
  const successRate = channelMessages.length > 0 ? round((processed / channelMessages.length) * 100) : 0;

  return {
    archived,
    averageLatencyMs: averageLatencyMs !== null ? round(averageLatencyMs) : null,
    endpointReadiness,
    failed,
    inflight,
    lastMessageAt: channelMessages.at(0)?.created_at ?? null,
    openIncidents: channelErrors.length,
    processed,
    recentVolume: channelMessages.length,
    successRate,
  };
}