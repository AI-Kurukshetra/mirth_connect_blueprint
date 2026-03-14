import { createClient } from "@/lib/supabase/server";
import { compactNumber } from "@/lib/utils";
import type { AlertHistoryRow, AlertRow, AuditLogRow, ChannelRow, ConnectorRow, ErrorLogRow, MessageRow, MetricRow, RoutingRuleRow, TransformationRow, ValidationRuleRow } from "@/types/database";

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
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
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
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
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
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    message_id: "MSG-00012",
    channel_id: "1",
    source_system: "Epic EHR",
    destination_system: "Legacy archive lane",
    message_type: "ADT^A08",
    message_format: "HL7v2",
    status: "archived",
    raw_payload: "MSH|^~\\&|Epic|Hospital|Archive|System|...",
    transformed_payload: null,
    error_message: null,
    custom_metadata: {
      archived: true,
      archivedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      archivedBy: "operator-1",
      archiveReason: "Manual archive from operator console",
      previousStatus: "failed"
    },
    retry_attempts: 1,
    processing_time_ms: 53,
    created_at: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
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
  {
    id: "1",
    message_id: "2",
    channel_id: "3",
    error_code: "NET-001",
    error_type: "network",
    error_message: "Connection refused: Pharmacy system at 10.0.2.30:2576 is unreachable after 3 retry attempts.",
    stack_trace: "SocketTimeoutException: Connect timed out\n  at com.medflow.transport.TcpClient.send(TcpClient.java:182)\n  at com.medflow.destination.DispatchWorker.run(DispatchWorker.java:91)",
    resolved: false,
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    message_id: null,
    channel_id: "2",
    error_code: "AUTH-003",
    error_type: "auth",
    error_message: "Bearer token expired: Payer gateway returned 401 Unauthorized.",
    resolved: true,
    resolved_by: "operator-2",
    resolved_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    message_id: "3",
    channel_id: "2",
    error_code: "VAL-004",
    error_type: "validation",
    error_message: "FHIR Observation payload is missing the subject reference required for downstream delivery.",
    stack_trace: null,
    resolved: false,
    created_at: new Date(Date.now() - 92 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    message_id: null,
    channel_id: "1",
    error_code: "QUEUE-002",
    error_type: "queue",
    error_message: "Outbound destination queue depth exceeded the configured threshold for the ADT lab lane.",
    resolved: false,
    created_at: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString(),
  },
];

const demoAudit: AuditLogRow[] = [
  {
    id: "1",
    user_id: "operator-1",
    action: "channel.updated",
    entity_type: "channel",
    entity_id: "CH-003",
    details: { field: "destination_type", previous: "SFTP", next: "REST", propagated_to: 2 },
    ip_address: "10.10.3.14",
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    user_id: null,
    action: "message.retried",
    entity_type: "message",
    entity_id: "MSG-00006",
    details: { attempt: 3, queue: "pharmacy-outbound", simulated: false },
    ip_address: null,
    created_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    user_id: "operator-2",
    action: "connector.tested",
    entity_type: "connector",
    entity_id: "CON-003",
    details: { latency_ms: 121, target: "lab-gateway.medflow.local", simulated: true },
    ip_address: "10.10.8.22",
    created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    user_id: "operator-1",
    action: "transformation.updated",
    entity_type: "transformation",
    entity_id: "TRF-001",
    details: { version: 4, output_format: "FHIR R4", change_ticket: "CAB-2481" },
    ip_address: "10.10.3.14",
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    user_id: null,
    action: "alert.triggered",
    entity_type: "alert",
    entity_id: "ALT-001",
    details: { threshold: "> 5", measured_value: 7.8, delivery: "slack" },
    ip_address: null,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "6",
    user_id: "operator-3",
    action: "validation_rule.updated",
    entity_type: "validation_rule",
    entity_id: "VAL-002",
    details: { severity: "warning", message_format: "FHIR", fields: ["identifier", "telecom"] },
    ip_address: "10.10.6.41",
    created_at: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "7",
    user_id: null,
    action: "routing_rule.archived",
    entity_type: "routing_rule",
    entity_id: "RR-003",
    details: { reason: "Deprecated payer lane", preserved_messages: 14 },
    ip_address: null,
    created_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
  },
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
  return channels.find((channel) => channel.channel_id === channelId || channel.id === channelId) ?? channels[0];
}

export async function getConnectors() {
  const supabase = await createClient();
  return safeSelect<ConnectorRow>(supabase.from("connectors").select("*").order("connector_id"), demoConnectors);
}

export async function getConnector(connectorId: string) {
  const connectors = await getConnectors();
  return connectors.find((connector) => connector.connector_id === connectorId || connector.id === connectorId) ?? null;
}

export async function getMessages() {
  const supabase = await createClient();
  return safeSelect<MessageRow>(supabase.from("messages").select("*").order("created_at", { ascending: false }), demoMessages);
}

export async function getMessage(messageId: string) {
  const messages = await getMessages();
  return messages.find((message) => message.message_id === messageId || message.id === messageId) ?? messages[0];
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




const demoTransformations: TransformationRow[] = [
  {
    id: "trf-1",
    transformation_id: "TRF-001",
    name: "HL7v2 ADT to FHIR Patient",
    description: "Maps ADT intake into a Patient resource envelope.",
    language: "javascript",
    script: 'function transform(message, maps) { return { resourceType: "Patient", id: maps.channelMap.patientId || "demo" }; }',
    input_format: "HL7v2",
    output_format: "FHIR_R4",
    version: 1,
    is_active: true,
    last_tested_at: new Date().toISOString(),
    test_result: "pass",
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "trf-2",
    transformation_id: "TRF-002",
    name: "ORU Result Normalizer",
    description: "Normalizes ORU payloads before downstream distribution.",
    language: "javascript",
    script: 'function transform(message) { return { resourceType: "Observation", status: "final", payload: message }; }',
    input_format: "HL7v2",
    output_format: "FHIR_R4",
    version: 1,
    is_active: true,
    last_tested_at: null,
    test_result: "untested",
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "trf-3",
    transformation_id: "TRF-003",
    name: "JSON to HL7v2 Mapper",
    description: "Builds an HL7-compatible envelope from JSON intake.",
    language: "javascript",
    script: 'function transform(message) { return "MSH|^~\\&|JSON|MEDFLOW|DEST|TARGET|" + new Date().toISOString(); }',
    input_format: "JSON",
    output_format: "HL7v2",
    version: 1,
    is_active: true,
    last_tested_at: null,
    test_result: "untested",
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const demoValidationRules: ValidationRuleRow[] = [
  {
    id: "val-1",
    rule_id: "VAL-001",
    name: "HL7v2 Required Fields",
    description: "Ensures key MSH and PID fields are present.",
    message_format: "HL7v2",
    rule_type: "required_fields",
    rule_definition: { required: ["MSH.3", "MSH.4", "MSH.9", "PID.3"] },
    is_active: true,
    severity: "error",
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "val-2",
    rule_id: "VAL-002",
    name: "FHIR Patient Schema",
    description: "Validates minimum Patient identity structure.",
    message_format: "FHIR_R4",
    rule_type: "schema",
    rule_definition: { resourceType: "Patient", required: ["id", "name"] },
    is_active: true,
    severity: "error",
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "val-3",
    rule_id: "VAL-003",
    name: "Message Size Guardrail",
    description: "Warns when payload size approaches platform limits.",
    message_format: "HL7v2",
    rule_type: "custom",
    rule_definition: { max_size_bytes: 102400 },
    is_active: true,
    severity: "warning",
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const demoRoutingRules: RoutingRuleRow[] = [
  {
    id: "rr-1",
    rule_id: "RR-001",
    name: "Route ADT Intake to FHIR Sync",
    description: "Routes admission traffic into the FHIR sync lane.",
    channel_id: "1",
    priority: 1,
    condition_type: "message_type",
    condition_field: "MSH.9",
    condition_operator: "equals",
    condition_value: "ADT^A01",
    action: "route_to",
    destination_channel_id: "2",
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "rr-2",
    rule_id: "RR-002",
    name: "Filter Test Traffic",
    description: "Stops test-mode traffic from reaching production destinations.",
    channel_id: "1",
    priority: 2,
    condition_type: "field_value",
    condition_field: "MSH.11",
    condition_operator: "equals",
    condition_value: "T",
    action: "filter",
    destination_channel_id: null,
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "rr-3",
    rule_id: "RR-003",
    name: "Archive Failed Pharmacy Retries",
    description: "Archives pharmacy traffic after repeated downstream failures.",
    channel_id: "3",
    priority: 1,
    condition_type: "source",
    condition_field: "destination_system",
    condition_operator: "contains",
    condition_value: "Pharmacy",
    action: "archive",
    destination_channel_id: null,
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const demoAlerts: AlertRow[] = [
  {
    id: "alt-1",
    alert_id: "ALT-001",
    name: "High Error Rate Alert",
    description: "Warns operators when message failures exceed the allowed threshold.",
    trigger_type: "error_rate",
    threshold_value: 5,
    threshold_operator: "gt",
    notification_channel: "email",
    notification_target: "admin@medflow.local",
    cooldown_minutes: 15,
    is_active: true,
    last_triggered: new Date(Date.now() - 5_400_000).toISOString(),
    trigger_count: 3,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "alt-2",
    alert_id: "ALT-002",
    name: "High Latency Alert",
    description: "Triggers when processing latency crosses the response budget.",
    trigger_type: "latency",
    threshold_value: 500,
    threshold_operator: "gt",
    notification_channel: "webhook",
    notification_target: "https://hooks.medflow.local/ops",
    cooldown_minutes: 10,
    is_active: true,
    last_triggered: null,
    trigger_count: 0,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const demoAlertHistory: AlertHistoryRow[] = [
  {
    id: "alth-1",
    alert_id: "alt-1",
    triggered_at: new Date(Date.now() - 5_400_000).toISOString(),
    trigger_value: 7.2,
    message: "Seeded historical trigger for dashboard and alerts testing.",
    notified: true,
    notified_at: new Date(Date.now() - 5_340_000).toISOString(),
  },
  {
    id: "alth-2",
    alert_id: "alt-1",
    triggered_at: new Date(Date.now() - 86_400_000).toISOString(),
    trigger_value: 5.9,
    message: "Error-rate spike resolved after downstream connector recovery.",
    notified: true,
    notified_at: new Date(Date.now() - 86_340_000).toISOString(),
  },
];
export async function getTransformations() {
  const supabase = await createClient();
  return safeSelect<TransformationRow>(supabase.from("transformations").select("*").order("transformation_id"), demoTransformations);
}

export async function getValidationRules() {
  const supabase = await createClient();
  return safeSelect<ValidationRuleRow>(supabase.from("validation_rules").select("*").order("rule_id"), demoValidationRules);
}

export async function getRoutingRules() {
  const supabase = await createClient();
  return safeSelect<RoutingRuleRow>(supabase.from("routing_rules").select("*").order("priority").order("rule_id"), demoRoutingRules);
}

export async function getAlerts() {
  const supabase = await createClient();
  return safeSelect<AlertRow>(supabase.from("alerts").select("*").order("alert_id"), demoAlerts);
}

export async function getAlert(alertId: string) {
  const alerts = await getAlerts();
  return alerts.find((alert) => alert.alert_id === alertId || alert.id === alertId) ?? null;
}

export async function getAlertHistory() {
  const supabase = await createClient();
  return safeSelect<AlertHistoryRow>(supabase.from("alert_history").select("*").order("triggered_at", { ascending: false }), demoAlertHistory);
}
