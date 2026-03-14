"use client";

import { useCallback } from "react";

// ── Connector type metadata ───────────────────────────────────────────────
export const SOURCE_CONNECTORS = [
  { value: "tcp_listener", label: "TCP / MLLP Listener", desc: "Receive HL7 messages over TCP with MLLP framing" },
  { value: "http_listener", label: "HTTP Listener", desc: "Receive data via HTTP/HTTPS endpoints" },
  { value: "file_reader", label: "File Reader", desc: "Poll directories for incoming files" },
  { value: "database_reader", label: "Database Reader", desc: "Poll database with SQL queries" },
  { value: "channel_reader", label: "Channel Reader", desc: "Receive messages from other channels" },
  { value: "javascript_reader", label: "JavaScript Reader", desc: "Generate messages via custom scripts" },
  { value: "ws_listener", label: "Web Service Listener", desc: "SOAP/WSDL web service endpoint" },
  { value: "dicom_listener", label: "DICOM Listener", desc: "Receive DICOM medical imaging data" },
] as const;

export const DEST_CONNECTORS = [
  { value: "tcp_sender", label: "TCP / MLLP Sender", desc: "Send HL7 messages over TCP with MLLP framing" },
  { value: "http_sender", label: "HTTP Sender", desc: "Send data via HTTP/HTTPS requests" },
  { value: "file_writer", label: "File Writer", desc: "Write messages to files on disk" },
  { value: "database_writer", label: "Database Writer", desc: "Write to database via SQL" },
  { value: "channel_writer", label: "Channel Writer", desc: "Route messages to other channels" },
  { value: "javascript_writer", label: "JavaScript Writer", desc: "Process messages via custom scripts" },
  { value: "smtp_sender", label: "SMTP Sender", desc: "Send email notifications" },
  { value: "document_writer", label: "Document Writer", desc: "Generate PDF/RTF documents" },
  { value: "ws_sender", label: "Web Service Sender", desc: "Send SOAP requests" },
  { value: "dicom_sender", label: "DICOM Sender", desc: "Send DICOM imaging data" },
] as const;

// ── Connector-specific property schemas ───────────────────────────────────
type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "toggle" | "textarea";
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  hint?: string;
};

const CONNECTOR_FIELDS: Record<string, FieldDef[]> = {
  tcp_listener: [
    { key: "host", label: "Host", type: "text", placeholder: "0.0.0.0", defaultValue: "0.0.0.0" },
    { key: "port", label: "Port", type: "number", placeholder: "6661", defaultValue: 6661 },
    { key: "mode", label: "Transmission Mode", type: "select", options: [
      { value: "mllp", label: "MLLP (Minimal Lower Layer Protocol)" },
      { value: "frame", label: "Frame Mode" },
      { value: "raw", label: "Raw" },
    ], defaultValue: "mllp" },
    { key: "receiveTimeout", label: "Receive Timeout (ms)", type: "number", placeholder: "0", defaultValue: 0, hint: "0 = no timeout" },
    { key: "bufferSize", label: "Buffer Size (bytes)", type: "number", placeholder: "65536", defaultValue: 65536 },
    { key: "keepAlive", label: "Keep Connection Alive", type: "toggle", defaultValue: true },
    { key: "maxConnections", label: "Max Connections", type: "number", placeholder: "10", defaultValue: 10 },
    { key: "encoding", label: "Encoding", type: "select", options: [
      { value: "utf-8", label: "UTF-8" },
      { value: "ascii", label: "ASCII" },
      { value: "iso-8859-1", label: "ISO-8859-1" },
    ], defaultValue: "utf-8" },
  ],
  tcp_sender: [
    { key: "host", label: "Remote Host", type: "text", placeholder: "127.0.0.1" },
    { key: "port", label: "Remote Port", type: "number", placeholder: "6661" },
    { key: "mode", label: "Transmission Mode", type: "select", options: [
      { value: "mllp", label: "MLLP (Minimal Lower Layer Protocol)" },
      { value: "frame", label: "Frame Mode" },
      { value: "raw", label: "Raw" },
    ], defaultValue: "mllp" },
    { key: "sendTimeout", label: "Send Timeout (ms)", type: "number", placeholder: "10000", defaultValue: 10000 },
    { key: "keepAlive", label: "Keep Connection Alive", type: "toggle", defaultValue: false },
    { key: "encoding", label: "Encoding", type: "select", options: [
      { value: "utf-8", label: "UTF-8" }, { value: "ascii", label: "ASCII" },
    ], defaultValue: "utf-8" },
  ],
  http_listener: [
    { key: "contextPath", label: "Context Path", type: "text", placeholder: "/api/hl7", defaultValue: "/" },
    { key: "port", label: "Port", type: "number", placeholder: "8080", defaultValue: 8080 },
    { key: "method", label: "Allowed Methods", type: "select", options: [
      { value: "all", label: "All Methods" }, { value: "GET", label: "GET" },
      { value: "POST", label: "POST" }, { value: "PUT", label: "PUT" },
    ], defaultValue: "all" },
    { key: "responseContentType", label: "Response Content-Type", type: "text", placeholder: "text/plain", defaultValue: "text/plain" },
    { key: "responseStatusCode", label: "Response Status Code", type: "number", placeholder: "200", defaultValue: 200 },
    { key: "charset", label: "Charset", type: "text", placeholder: "UTF-8", defaultValue: "UTF-8" },
    { key: "useTLS", label: "Use TLS / HTTPS", type: "toggle", defaultValue: false },
  ],
  http_sender: [
    { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/fhir" },
    { key: "method", label: "HTTP Method", type: "select", options: [
      { value: "POST", label: "POST" }, { value: "PUT", label: "PUT" },
      { value: "GET", label: "GET" }, { value: "DELETE", label: "DELETE" }, { value: "PATCH", label: "PATCH" },
    ], defaultValue: "POST" },
    { key: "contentType", label: "Content-Type", type: "text", placeholder: "application/json", defaultValue: "application/json" },
    { key: "headers", label: "Custom Headers (JSON)", type: "textarea", placeholder: '{"Authorization": "Bearer ..."}' },
    { key: "authType", label: "Authentication", type: "select", options: [
      { value: "none", label: "None" }, { value: "basic", label: "Basic Auth" },
      { value: "bearer", label: "Bearer Token" }, { value: "oauth2", label: "OAuth 2.0" },
    ], defaultValue: "none" },
    { key: "timeout", label: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: 30000 },
    { key: "followRedirects", label: "Follow Redirects", type: "toggle", defaultValue: true },
  ],
  file_reader: [
    { key: "directory", label: "Directory Path", type: "text", placeholder: "/opt/hl7/inbound" },
    { key: "filePattern", label: "File Pattern", type: "text", placeholder: "*.hl7", defaultValue: "*" },
    { key: "pollingInterval", label: "Polling Interval (ms)", type: "number", placeholder: "5000", defaultValue: 5000 },
    { key: "sortBy", label: "Sort By", type: "select", options: [
      { value: "date", label: "Date Modified" }, { value: "name", label: "File Name" },
      { value: "size", label: "File Size" },
    ], defaultValue: "date" },
    { key: "afterRead", label: "After Processing", type: "select", options: [
      { value: "delete", label: "Delete File" }, { value: "move", label: "Move to Directory" },
      { value: "none", label: "Do Nothing" },
    ], defaultValue: "move" },
    { key: "moveToDir", label: "Move-to Directory", type: "text", placeholder: "/opt/hl7/processed" },
    { key: "recursive", label: "Include Subdirectories", type: "toggle", defaultValue: false },
  ],
  file_writer: [
    { key: "directory", label: "Directory Path", type: "text", placeholder: "/opt/hl7/outbound" },
    { key: "fileName", label: "File Name Pattern", type: "text", placeholder: "msg_${date}_${count}.hl7", defaultValue: "output.hl7" },
    { key: "writeMode", label: "Write Mode", type: "select", options: [
      { value: "overwrite", label: "Overwrite" }, { value: "append", label: "Append" },
      { value: "new", label: "New File Each Message" },
    ], defaultValue: "new" },
    { key: "encoding", label: "Encoding", type: "select", options: [
      { value: "utf-8", label: "UTF-8" }, { value: "ascii", label: "ASCII" },
    ], defaultValue: "utf-8" },
    { key: "createDirs", label: "Create Directories", type: "toggle", defaultValue: true },
  ],
  database_reader: [
    { key: "driver", label: "Database Driver", type: "select", options: [
      { value: "postgresql", label: "PostgreSQL" }, { value: "mysql", label: "MySQL" },
      { value: "mssql", label: "SQL Server" }, { value: "oracle", label: "Oracle" },
    ], defaultValue: "postgresql" },
    { key: "url", label: "JDBC URL", type: "text", placeholder: "jdbc:postgresql://localhost:5432/mydb" },
    { key: "username", label: "Username", type: "text", placeholder: "dbuser" },
    { key: "password", label: "Password", type: "text", placeholder: "••••••" },
    { key: "query", label: "SQL Query", type: "textarea", placeholder: "SELECT * FROM hl7_queue WHERE processed = false" },
    { key: "pollingInterval", label: "Polling Interval (ms)", type: "number", placeholder: "5000", defaultValue: 5000 },
    { key: "postProcessQuery", label: "Post-Process Statement", type: "textarea", placeholder: "UPDATE hl7_queue SET processed = true WHERE id = ${messageId}", hint: "Runs after each message is read" },
  ],
  database_writer: [
    { key: "driver", label: "Database Driver", type: "select", options: [
      { value: "postgresql", label: "PostgreSQL" }, { value: "mysql", label: "MySQL" },
      { value: "mssql", label: "SQL Server" }, { value: "oracle", label: "Oracle" },
    ], defaultValue: "postgresql" },
    { key: "url", label: "JDBC URL", type: "text", placeholder: "jdbc:postgresql://localhost:5432/mydb" },
    { key: "username", label: "Username", type: "text", placeholder: "dbuser" },
    { key: "password", label: "Password", type: "text", placeholder: "••••••" },
    { key: "query", label: "SQL Statement", type: "textarea", placeholder: "INSERT INTO messages (content, created_at) VALUES (${message.rawData}, NOW())" },
  ],
  channel_reader: [
    { key: "channelId", label: "Source Channel ID", type: "text", placeholder: "UUID of source channel" },
    { key: "waitForResponse", label: "Wait for Response", type: "toggle", defaultValue: true },
  ],
  channel_writer: [
    { key: "channelId", label: "Destination Channel ID", type: "text", placeholder: "UUID of destination channel" },
    { key: "waitForResponse", label: "Wait for Response", type: "toggle", defaultValue: false },
  ],
  javascript_reader: [
    { key: "pollingInterval", label: "Polling Interval (ms)", type: "number", placeholder: "5000", defaultValue: 5000 },
    { key: "script", label: "Script (return message string)", type: "textarea", placeholder: "// Return a message string or array of strings\nreturn '';" },
  ],
  javascript_writer: [
    { key: "script", label: "Script", type: "textarea", placeholder: "// Access message via msg variable\nlogger.info('Processing: ' + msg);" },
  ],
  smtp_sender: [
    { key: "smtpHost", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
    { key: "smtpPort", label: "SMTP Port", type: "number", placeholder: "587", defaultValue: 587 },
    { key: "useTLS", label: "Use TLS", type: "toggle", defaultValue: true },
    { key: "username", label: "Username / Email", type: "text", placeholder: "alerts@hospital.org" },
    { key: "password", label: "Password", type: "text", placeholder: "••••••" },
    { key: "from", label: "From Address", type: "text", placeholder: "alerts@hospital.org" },
    { key: "to", label: "To Address(es)", type: "text", placeholder: "admin@hospital.org, ops@hospital.org" },
    { key: "subject", label: "Subject Template", type: "text", placeholder: "Alert: ${channelName} - ${errorMessage}" },
  ],
  document_writer: [
    { key: "format", label: "Output Format", type: "select", options: [
      { value: "pdf", label: "PDF" }, { value: "rtf", label: "RTF" },
    ], defaultValue: "pdf" },
    { key: "directory", label: "Output Directory", type: "text", placeholder: "/opt/reports" },
    { key: "fileName", label: "File Name Pattern", type: "text", placeholder: "report_${date}.pdf" },
    { key: "template", label: "Document Template", type: "textarea", placeholder: "<html>...</html>" },
  ],
  ws_listener: [
    { key: "serviceName", label: "Service Name", type: "text", placeholder: "HL7Service" },
    { key: "port", label: "Port", type: "number", placeholder: "8081", defaultValue: 8081 },
    { key: "wsdlUrl", label: "WSDL URL (optional)", type: "text", placeholder: "" },
  ],
  ws_sender: [
    { key: "wsdlUrl", label: "WSDL URL", type: "text", placeholder: "https://example.com/service?wsdl" },
    { key: "serviceName", label: "Service Name", type: "text" },
    { key: "port", label: "Port Name", type: "text" },
    { key: "soapAction", label: "SOAP Action", type: "text" },
  ],
  dicom_listener: [
    { key: "aeTitle", label: "AE Title", type: "text", placeholder: "HEALTHBRIDGE", defaultValue: "HEALTHBRIDGE" },
    { key: "port", label: "Port", type: "number", placeholder: "4096", defaultValue: 4096 },
    { key: "maxAssociations", label: "Max Associations", type: "number", placeholder: "10", defaultValue: 10 },
  ],
  dicom_sender: [
    { key: "remoteHost", label: "Remote Host", type: "text", placeholder: "pacs.hospital.org" },
    { key: "remotePort", label: "Remote Port", type: "number", placeholder: "4096" },
    { key: "remoteAeTitle", label: "Remote AE Title", type: "text" },
    { key: "localAeTitle", label: "Local AE Title", type: "text", defaultValue: "HEALTHBRIDGE" },
  ],
  jms_listener: [
    { key: "jndiUrl", label: "JNDI URL", type: "text", placeholder: "tcp://localhost:61616" },
    { key: "queueName", label: "Queue / Topic Name", type: "text", placeholder: "hl7.inbound" },
    { key: "durable", label: "Durable Subscription", type: "toggle", defaultValue: false },
  ],
  jms_sender: [
    { key: "jndiUrl", label: "JNDI URL", type: "text", placeholder: "tcp://localhost:61616" },
    { key: "queueName", label: "Queue / Topic Name", type: "text", placeholder: "hl7.outbound" },
  ],
};

// ── Props ─────────────────────────────────────────────────────────────────
interface ConnectorFormProps {
  connectorType: string;
  properties: Record<string, unknown>;
  onChange: (properties: Record<string, unknown>) => void;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function ConnectorForm({ connectorType, properties, onChange }: ConnectorFormProps) {
  const fields = CONNECTOR_FIELDS[connectorType] ?? [];

  const update = useCallback(
    (key: string, value: unknown) => {
      onChange({ ...properties, [key]: value });
    },
    [properties, onChange],
  );

  if (fields.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--hb-border)] bg-[var(--hb-surface)]/40 px-5 py-8 text-center">
        <p className="text-sm text-[var(--hb-text-tertiary)] font-[family-name:var(--font-jetbrains)]">No configurable properties for this connector type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const val = properties[f.key] ?? f.defaultValue ?? "";

        if (f.type === "toggle") {
          return (
            <label key={f.key} className="flex items-center justify-between gap-4 group cursor-pointer">
              <div>
                <span className="text-sm font-medium text-[var(--hb-text-secondary)]">{f.label}</span>
                {f.hint && <p className="text-xs text-[var(--hb-text-ghost)] mt-0.5">{f.hint}</p>}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(val)}
                onClick={() => update(f.key, !val)}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
                  ${val ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border-bright)]"}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform
                    ${val ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
            </label>
          );
        }

        return (
          <div key={f.key}>
            <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">
              {f.label}
            </label>
            {f.type === "select" ? (
              <select
                value={String(val)}
                onChange={(e) => update(f.key, e.target.value)}
                className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] focus:ring-1 focus:ring-[var(--hb-teal)]/40 outline-none transition-colors appearance-none"
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                value={String(val)}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={4}
                className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] focus:ring-1 focus:ring-[var(--hb-teal)]/40 outline-none resize-none transition-colors"
              />
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                value={val as string | number}
                onChange={(e) => update(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] focus:ring-1 focus:ring-[var(--hb-teal)]/40 outline-none transition-colors"
              />
            )}
            {f.hint && <p className="text-xs text-[var(--hb-text-ghost)] mt-1">{f.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
