export type MessageFormat = "HL7v2" | "HL7v3" | "FHIR_R4" | "FHIR_R5" | "JSON" | "XML" | "CSV";
export type UserRole = "admin" | "engineer" | "viewer";
export type TransformationLanguage = "javascript" | "xslt" | "groovy" | "python";
export type ValidationRuleType = "schema" | "required_fields" | "format" | "custom";
export type ValidationSeverity = "error" | "warning" | "info";
export type RoutingConditionType = "message_type" | "field_value" | "source" | "format" | "custom";
export type RoutingOperator = "equals" | "contains" | "starts_with" | "regex" | "exists";
export type RoutingAction = "route_to" | "filter" | "transform" | "duplicate" | "archive";
export type AlertTriggerType = "error_rate" | "latency" | "message_failure" | "channel_down" | "queue_depth" | "custom";
export type AlertNotificationChannel = "email" | "webhook" | "slack" | "sms";

export interface ChannelRow {
  id: string;
  channel_id: string;
  name: string;
  description: string | null;
  source_type: string;
  destination_type: string;
  message_format: Exclude<MessageFormat, "CSV">;
  status: "active" | "inactive" | "error" | "paused";
  filter_rules?: Record<string, unknown> | null;
  transformation?: string | null;
  transformation_id?: string | null;
  validation_rule_id?: string | null;
  enabled?: boolean;
  source_connector_type?: string | null;
  source_connector_properties?: Record<string, unknown> | null;
  source_filter?: Record<string, unknown> | null;
  source_transformer?: Record<string, unknown> | null;
  preprocessor_script?: string | null;
  postprocessor_script?: string | null;
  retry_count: number;
  retry_interval: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectorRow {
  id: string;
  connector_id: string;
  name: string;
  type: string;
  direction: "source" | "destination" | "bidirectional";
  host: string | null;
  port: number | null;
  path_or_queue?: string | null;
  auth_method: string | null;
  status: "connected" | "disconnected" | "error" | "testing";
  last_ping: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransformationRow {
  id: string;
  transformation_id: string;
  name: string;
  description: string | null;
  language: TransformationLanguage;
  script: string;
  input_format: MessageFormat | null;
  output_format: MessageFormat | null;
  version: number;
  is_active: boolean;
  last_tested_at: string | null;
  test_result: "pass" | "fail" | "untested" | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationRuleRow {
  id: string;
  rule_id: string;
  name: string;
  description: string | null;
  message_format: MessageFormat;
  rule_type: ValidationRuleType;
  rule_definition: Record<string, unknown>;
  is_active: boolean;
  severity: ValidationSeverity;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutingRuleRow {
  id: string;
  rule_id: string;
  name: string;
  description: string | null;
  channel_id: string | null;
  priority: number;
  condition_type: RoutingConditionType;
  condition_field: string | null;
  condition_operator: RoutingOperator | null;
  condition_value: string | null;
  action: RoutingAction;
  destination_channel_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertRow {
  id: string;
  alert_id: string;
  name: string;
  description: string | null;
  trigger_type: AlertTriggerType;
  threshold_value: number | null;
  threshold_operator: "gt" | "lt" | "gte" | "lte" | "eq" | null;
  notification_channel: AlertNotificationChannel;
  notification_target: string;
  cooldown_minutes: number;
  is_active: boolean;
  last_triggered: string | null;
  trigger_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertHistoryRow {
  id: string;
  alert_id: string;
  triggered_at: string;
  trigger_value: number | null;
  message: string | null;
  notified: boolean;
  notified_at: string | null;
}

export interface MessageRow {
  id: string;
  message_id: string;
  channel_id: string | null;
  source_system: string;
  destination_system: string;
  message_type: string;
  message_format: string;
  status: "processed" | "failed" | "queued" | "retrying" | "filtered" | "archived" | "received" | "transformed" | "sent" | "error" | "pending";
  raw_payload: string | null;
  transformed_payload: string | null;
  error_message: string | null;
  connector_name?: string | null;
  data_type?: string | null;
  direction?: string | null;
  raw_content?: string | null;
  transformed_content?: string | null;
  encoded_content?: string | null;
  sent_content?: string | null;
  response_content?: string | null;
  error_content?: string | null;
  connector_map?: Record<string, unknown> | null;
  channel_map?: Record<string, unknown> | null;
  response_map?: Record<string, unknown> | null;
  custom_metadata?: Record<string, unknown> | null;
  retry_attempts: number;
  processing_time_ms: number | null;
  created_at: string;
}

export interface DestinationRow {
  id: string;
  channel_id: string;
  name: string;
  sort_order: number;
  enabled: boolean;
  connector_type: string;
  connector_properties: Record<string, unknown> | null;
  filter: Record<string, unknown> | null;
  transformer: Record<string, unknown> | null;
  response_transformer?: Record<string, unknown> | null;
  queue_enabled: boolean;
  retry_count: number;
  retry_interval_ms: number;
  rotate_queue?: boolean;
  queue_thread_count?: number;
  inbound_data_type?: string | null;
  outbound_data_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FhirResourceRow {
  id: string;
  resource_type: string;
  resource_id: string;
  version: number;
  resource_data: Record<string, unknown>;
  source_message_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ErrorLogRow {
  id: string;
  message_id: string | null;
  channel_id: string | null;
  error_code: string;
  error_type: string;
  error_message: string;
  stack_trace?: string | null;
  resolved: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

export interface MetricRow {
  id: string;
  recorded_at: string;
  messages_total: number;
  messages_success: number;
  messages_failed: number;
  avg_latency_ms: number | null;
  throughput_per_min: number | null;
  cpu_usage_pct: number | null;
  memory_usage_pct: number | null;
  active_channels: number;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface TableShape<Row, Insert, Update> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      channels: TableShape<ChannelRow, Omit<ChannelRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }, Partial<ChannelRow>>;
      connectors: TableShape<ConnectorRow, Omit<ConnectorRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }, Partial<ConnectorRow>>;
      transformations: TableShape<TransformationRow, Omit<TransformationRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }, Partial<TransformationRow>>;
      validation_rules: TableShape<ValidationRuleRow, Omit<ValidationRuleRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }, Partial<ValidationRuleRow>>;
      routing_rules: TableShape<RoutingRuleRow, Omit<RoutingRuleRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }, Partial<RoutingRuleRow>>;
      alerts: TableShape<AlertRow, Omit<AlertRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }, Partial<AlertRow>>;
      alert_history: TableShape<AlertHistoryRow, Omit<AlertHistoryRow, "id"> & { id?: string }, Partial<AlertHistoryRow>>;
      messages: TableShape<MessageRow, Omit<MessageRow, "id" | "created_at"> & { id?: string; created_at?: string }, Partial<MessageRow>>;
      destinations: TableShape<DestinationRow, Omit<DestinationRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }, Partial<DestinationRow>>;
      fhir_resources: TableShape<FhirResourceRow, Omit<FhirResourceRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }, Partial<FhirResourceRow>>;
      error_logs: TableShape<ErrorLogRow, Omit<ErrorLogRow, "id" | "created_at"> & { id?: string; created_at?: string }, Partial<ErrorLogRow>>;
      audit_logs: TableShape<AuditLogRow, Omit<AuditLogRow, "id" | "created_at"> & { id?: string; created_at?: string }, Partial<AuditLogRow>>;
      performance_metrics: TableShape<MetricRow, Omit<MetricRow, "id"> & { id?: string }, Partial<MetricRow>>;
      profiles: TableShape<ProfileRow, Omit<ProfileRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string }, Partial<ProfileRow>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
