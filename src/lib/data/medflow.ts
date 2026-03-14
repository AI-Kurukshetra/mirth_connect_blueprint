import { createClient } from "@/lib/supabase/server";
import { compactNumber } from "@/lib/utils";
import type { AuditLogRow, ChannelRow, ConnectorRow, ErrorLogRow, MessageRow, MetricRow } from "@/types/database";

const demoChannels: ChannelRow[] = [
  {
    id: "1",
    channel_id: "CH-001",
    name: "ADT Feed - Epic to Lab",
    description: "Admit, discharge, and transfer events into the core lab workflow.",
    source_type: "MLLP",
    destination_type: "Database",
    message_format: "HL7v2",
    status: "active",
    retry_count: 3,
    retry_interval: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    channel_id: "CH-003",
    name: "FHIR Patient Sync",
    description: "Patient demographics sync to the national HIE.",
    source_type: "HTTP",
    destination_type: "REST",
    message_format: "FHIR_R4",
    status: "active",
    retry_count: 5,
    retry_interval: 90,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    channel_id: "CH-006",
    name: "Pharmacy Dispense Feed",
    description: "Medication dispense events from Epic into the pharmacy system.",
    source_type: "MLLP",
    destination_type: "TCP",
    message_format: "HL7v2",
    status: "error",
    retry_count: 3,
    retry_interval: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const demoConnectors: ConnectorRow[] = [
  {
    id: "1",
    connector_id: "CON-001",
    name: "Epic EHR MLLP Source",
    type: "MLLP",
    direction: "source",
    host: "10.0.1.50",
    port: 2575,
    auth_method: "certificate",
    status: "connected",
    last_ping: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    connector_id: "CON-003",
    name: "National HIE REST Endpoint",
    type: "REST",
    direction: "destination",
    host: "api.nhie.gov",
    port: 443,
    auth_method: "token",
    status: "connected",
    last_ping: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    connector_id: "CON-005",
    name: "Payer Gateway API",
    type: "REST",
    direction: "bidirectional",
    host: "api.payer.com",
    port: 443,
    auth_method: "token",
    status: "error",
    last_ping: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const demoMessages: MessageRow[] = [
  {
    id: "1",
    message_id: "MSG-00001",
    channel_id: "1",
    source_system: "Epic EHR",
    destination_system: "Lab System",
    message_type: "ADT^A01",
    message_format: "HL7v2",
    status: "processed",
    raw_payload: "MSH|^~\\&|Epic|Hospital|Lab|System|...",
    transformed_payload: "{\"patient\":\"123\"}",
    error_message: null,
    retry_attempts: 0,
    processing_time_ms: 42,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    message_id: "MSG-00006",
    channel_id: "3",
    source_system: "Epic EHR",
    destination_system: "Pharmacy",
    message_type: "RDS^O13",
    message_format: "HL7v2",
    status: "failed",
    raw_payload: "MSH|^~\\&|Epic|Hospital|Pharmacy|System|...",
    transformed_payload: null,
    error_message: "Connection refused after 3 retry attempts.",
    retry_attempts: 3,
    processing_time_ms: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    message_id: "MSG-00009",
    channel_id: "2",
    source_system: "Epic EHR",
    destination_system: "National HIE",
    message_type: "Observation",
    message_format: "FHIR_R4",
    status: "processed",
    raw_payload: "{\"resourceType\":\"Observation\"}",
    transformed_payload: "{\"resourceType\":\"Observation\",\"status\":\"final\"}",
    error_message: null,
    retry_attempts: 0,
    processing_time_ms: 98,
    created_at: new Date().toISOString(),
  },
];

const demoMetrics: MetricRow[] = [
  { id: "1", recorded_at: new Date(Date.now() - 18_000_000).toISOString(), messages_total: 843, messages_success: 821, messages_failed: 22, avg_latency_ms: 67.4, throughput_per_min: 2.8, cpu_usage_pct: 34.2, memory_usage_pct: 48.1, active_channels: 6 },
  { id: "2", recorded_at: new Date(Date.now() - 14_400_000).toISOString(), messages_total: 912, messages_success: 898, messages_failed: 14, avg_latency_ms: 72.1, throughput_per_min: 3.0, cpu_usage_pct: 38.7, memory_usage_pct: 50.3, active_channels: 6 },
  { id: "3", recorded_at: new Date(Date.now() - 10_800_000).toISOString(), messages_total: 1045, messages_success: 1021, messages_failed: 24, avg_latency_ms: 65.8, throughput_per_min: 3.5, cpu_usage_pct: 42.1, memory_usage_pct: 52.6, active_channels: 7 },
  { id: "4", recorded_at: new Date(Date.now() - 7_200_000).toISOString(), messages_total: 987, messages_success: 975, messages_failed: 12, avg_latency_ms: 61.3, throughput_per_min: 3.3, cpu_usage_pct: 39.5, memory_usage_pct: 51.0, active_channels: 7 },
  { id: "5", recorded_at: new Date(Date.now() - 3_600_000).toISOString(), messages_total: 756, messages_success: 740, messages_failed: 16, avg_latency_ms: 58.9, throughput_per_min: 2.5, cpu_usage_pct: 31.2, memory_usage_pct: 46.8, active_channels: 5 },
  { id: "6", recorded_at: new Date().toISOString(), messages_total: 324, messages_success: 316, messages_failed: 8, avg_latency_ms: 54.2, throughput_per_min: 2.1, cpu_usage_pct: 28.4, memory_usage_pct: 44.5, active_channels: 5 },
];

const demoErrors: ErrorLogRow[] = [
  { id: "1", message_id: "2", channel_id: "3", error_code: "NET-001", error_type: "network", error_message: "Connection refused: Pharmacy system at 10.0.2.30:2576 is unreachable after 3 retry attempts.", resolved: false, created_at: new Date().toISOString() },
  { id: "2", message_id: null, channel_id: "2", error_code: "AUTH-003", error_type: "auth", error_message: "Bearer token expired: Payer gateway returned 401 Unauthorized.", resolved: true, created_at: new Date().toISOString() },
];

const demoAudit: AuditLogRow[] = [
  { id: "1", user_id: null, action: "channel.updated", entity_type: "channel", entity_id: "CH-003", created_at: new Date().toISOString() },
  { id: "2", user_id: null, action: "message.retried", entity_type: "message", entity_id: "MSG-00006", created_at: new Date().toISOString() },
  { id: "3", user_id: null, action: "connector.tested", entity_type: "connector", entity_id: "CON-003", created_at: new Date().toISOString() },
];

async function safeSelect<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>, fallback: T[]) {
  try {
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return fallback;
    }
    return data;
  } catch {
    return fallback;
  }
}

export async function getChannels() {
  const supabase = await createClient();
  return safeSelect<ChannelRow>(supabase.from("channels").select("*").order("channel_id"), demoChannels);
}

export async function getChannel(channelId: string) {
  const channels = await getChannels();
  return channels.find((channel) => channel.channel_id === channelId) ?? channels[0];
}

export async function getConnectors() {
  const supabase = await createClient();
  return safeSelect<ConnectorRow>(supabase.from("connectors").select("*").order("connector_id"), demoConnectors);
}

export async function getMessages() {
  const supabase = await createClient();
  return safeSelect<MessageRow>(supabase.from("messages").select("*").order("created_at", { ascending: false }), demoMessages);
}

export async function getMessage(messageId: string) {
  const messages = await getMessages();
  return messages.find((message) => message.message_id === messageId) ?? messages[0];
}

export async function getMetrics() {
  const supabase = await createClient();
  return safeSelect<MetricRow>(supabase.from("performance_metrics").select("*").order("recorded_at"), demoMetrics);
}

export async function getErrorLogs() {
  const supabase = await createClient();
  return safeSelect<ErrorLogRow>(supabase.from("error_logs").select("*").order("created_at", { ascending: false }), demoErrors);
}

export async function getAuditLogs() {
  const supabase = await createClient();
  return safeSelect<AuditLogRow>(supabase.from("audit_logs").select("*").order("created_at", { ascending: false }), demoAudit);
}

export async function getDashboardSnapshot() {
  const [channels, messages, connectors, metrics, errors] = await Promise.all([
    getChannels(),
    getMessages(),
    getConnectors(),
    getMetrics(),
    getErrorLogs(),
  ]);

  const latestMetric = metrics.at(-1) ?? demoMetrics.at(-1)!;
  const healthyConnectors = connectors.filter((connector) => connector.status === "connected").length;

  return {
    channels,
    connectors,
    messages: messages.slice(0, 6),
    metrics,
    stats: [
      {
        label: "Messages today",
        value: compactNumber(latestMetric.messages_total),
        detail: `${latestMetric.messages_success} succeeded / ${latestMetric.messages_failed} failed`,
      },
      {
        label: "Active channels",
        value: String(channels.filter((channel) => channel.status === "active").length),
        detail: `${channels.length} configured lanes`,
      },
      {
        label: "Healthy connectors",
        value: String(healthyConnectors),
        detail: `${connectors.length - healthyConnectors} need attention`,
      },
      {
        label: "Open incidents",
        value: String(errors.filter((error) => !error.resolved).length),
        detail: "Live operational defects",
      },
    ],
  };
}

