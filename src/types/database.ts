export interface ChannelRow {
  id: string;
  channel_id: string;
  name: string;
  description: string | null;
  source_type: string;
  destination_type: string;
  message_format: "HL7v2" | "HL7v3" | "FHIR_R4" | "FHIR_R5" | "JSON" | "XML";
  status: "active" | "inactive" | "error" | "paused";
  filter_rules?: Record<string, unknown> | null;
  transformation?: string | null;
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

export interface MessageRow {
  id: string;
  message_id: string;
  channel_id: string | null;
  source_system: string;
  destination_system: string;
  message_type: string;
  message_format: string;
  status: "processed" | "failed" | "queued" | "retrying" | "filtered";
  raw_payload: string | null;
  transformed_payload: string | null;
  error_message: string | null;
  retry_attempts: number;
  processing_time_ms: number | null;
  created_at: string;
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
  role: "admin" | "engineer" | "viewer";
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
      messages: TableShape<MessageRow, Omit<MessageRow, "id" | "created_at"> & { id?: string; created_at?: string }, Partial<MessageRow>>;
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
