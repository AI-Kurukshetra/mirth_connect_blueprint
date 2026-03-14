/**
 * Connector Simulator
 *
 * Simulates various connector types for the Healthcare Integration Engine MVP.
 * Each connector handles message framing, transport simulation, and response generation.
 */

// ---- Types ----

export type ConnectorType = "TCP/MLLP" | "HTTP" | "File" | "Database" | "SMTP" | "Channel";

export interface ConnectorProperties {
  host?: string;
  port?: number;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  filePath?: string;
  filePattern?: string;
  query?: string;
  connectionString?: string;
  channelId?: string;
  [key: string]: unknown;
}

export interface ConnectorResult {
  status: "success" | "failure" | "queued";
  statusCode?: number;
  response: string;
  responseHeaders?: Record<string, string>;
  sentPayload: string;
  connectorType: ConnectorType;
  elapsedMs: number;
  error?: string;
}

// ---- MLLP Framing ----

const MLLP_START = "\x0b"; // VT (vertical tab)
const MLLP_END = "\x1c\x0d"; // FS + CR

export function wrapMLLP(message: string): string {
  return `${MLLP_START}${message}${MLLP_END}`;
}

export function unwrapMLLP(framed: string): string {
  let msg = framed;
  if (msg.startsWith(MLLP_START)) {
    msg = msg.substring(1);
  }
  if (msg.endsWith(MLLP_END)) {
    msg = msg.substring(0, msg.length - 2);
  } else if (msg.endsWith("\x1c")) {
    msg = msg.substring(0, msg.length - 1);
  }
  return msg;
}

/**
 * Generate an HL7 ACK message for a given control ID.
 */
function generateHL7Ack(messageControlId: string, ackCode: string = "AA"): string {
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  return [
    `MSH|^~\\&|ENGINE|FACILITY|SENDER|FACILITY|${ts}||ACK|${Date.now()}|P|2.5`,
    `MSA|${ackCode}|${messageControlId}`,
  ].join("\r");
}

/**
 * Extract the message control ID from an HL7 message (MSH.10).
 */
function extractControlId(message: string): string {
  const lines = message.split(/\r\n|\r|\n/);
  const msh = lines.find((l) => l.startsWith("MSH"));
  if (!msh) return String(Date.now());
  const fields = msh.split("|");
  return fields[9] || String(Date.now());
}

// ---- Connector Implementations ----

async function simulateTcpMllp(
  message: string,
  properties: ConnectorProperties
): Promise<ConnectorResult> {
  const start = Date.now();
  const framedMessage = wrapMLLP(message);
  const controlId = extractControlId(message);

  // Simulate network latency (5-25ms)
  await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20) + 5));

  const ack = generateHL7Ack(controlId, "AA");

  return {
    status: "success",
    statusCode: 200,
    response: ack,
    sentPayload: framedMessage,
    connectorType: "TCP/MLLP",
    elapsedMs: Date.now() - start,
  };
}

async function simulateHttp(
  message: string,
  properties: ConnectorProperties
): Promise<ConnectorResult> {
  const start = Date.now();
  const method = (properties.method || "POST").toUpperCase();
  const url = properties.url || "http://localhost:8080/api/receive";

  // Simulate HTTP latency (10-50ms)
  await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 40) + 10));

  const responseBody = JSON.stringify({
    status: "accepted",
    messageId: `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
  });

  return {
    status: "success",
    statusCode: 200,
    response: responseBody,
    responseHeaders: {
      "content-type": "application/json",
      "x-request-id": `req-${Date.now()}`,
    },
    sentPayload: message,
    connectorType: "HTTP",
    elapsedMs: Date.now() - start,
  };
}

async function simulateFile(
  message: string,
  properties: ConnectorProperties
): Promise<ConnectorResult> {
  const start = Date.now();
  const filePath = properties.filePath || "/var/data/outbound/";
  const fileName = `msg_${Date.now()}.hl7`;
  const fullPath = `${filePath}${fileName}`;

  // Simulate file I/O latency (2-10ms)
  await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 8) + 2));

  return {
    status: "success",
    response: JSON.stringify({
      action: "write",
      path: fullPath,
      bytesWritten: Buffer.byteLength(message, "utf-8"),
      timestamp: new Date().toISOString(),
    }),
    sentPayload: message,
    connectorType: "File",
    elapsedMs: Date.now() - start,
  };
}

async function simulateDatabase(
  message: string,
  properties: ConnectorProperties
): Promise<ConnectorResult> {
  const start = Date.now();
  const query = properties.query || "INSERT INTO messages (content) VALUES (?)";

  // Simulate DB latency (5-30ms)
  await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 25) + 5));

  return {
    status: "success",
    response: JSON.stringify({
      action: "execute",
      query,
      rowsAffected: 1,
      generatedId: Math.floor(Math.random() * 100000),
      timestamp: new Date().toISOString(),
    }),
    sentPayload: message,
    connectorType: "Database",
    elapsedMs: Date.now() - start,
  };
}

// ---- Public API ----

/**
 * Send a message using the specified connector type.
 */
export async function sendMessage(
  connectorType: string,
  message: string,
  properties: ConnectorProperties = {}
): Promise<ConnectorResult> {
  const type = normalizeConnectorType(connectorType);

  switch (type) {
    case "TCP/MLLP":
      return simulateTcpMllp(message, properties);
    case "HTTP":
      return simulateHttp(message, properties);
    case "File":
      return simulateFile(message, properties);
    case "Database":
      return simulateDatabase(message, properties);
    default:
      return {
        status: "failure",
        response: `Unsupported connector type: ${connectorType}`,
        sentPayload: message,
        connectorType: type,
        elapsedMs: 0,
        error: `Unsupported connector type: ${connectorType}`,
      };
  }
}

/**
 * Receive/parse an incoming message based on connector type.
 * For source connectors, this handles de-framing.
 */
export function receiveMessage(
  connectorType: string,
  rawData: string
): { message: string; metadata: Record<string, unknown> } {
  const type = normalizeConnectorType(connectorType);

  switch (type) {
    case "TCP/MLLP": {
      const message = unwrapMLLP(rawData);
      return {
        message,
        metadata: {
          framing: "MLLP",
          originalLength: rawData.length,
          unframedLength: message.length,
        },
      };
    }
    case "HTTP":
      return {
        message: rawData,
        metadata: { contentType: "application/json" },
      };
    case "File":
      return {
        message: rawData,
        metadata: { source: "file" },
      };
    case "Database":
      return {
        message: rawData,
        metadata: { source: "database" },
      };
    default:
      return { message: rawData, metadata: {} };
  }
}

function normalizeConnectorType(type: string): ConnectorType {
  const upper = type.toUpperCase();
  if (upper.includes("MLLP") || upper.includes("TCP")) return "TCP/MLLP";
  if (upper.includes("HTTP") || upper.includes("REST")) return "HTTP";
  if (upper.includes("FILE")) return "File";
  if (upper.includes("DB") || upper.includes("DATABASE") || upper.includes("SQL")) return "Database";
  if (upper.includes("SMTP") || upper.includes("EMAIL")) return "SMTP";
  if (upper.includes("CHANNEL")) return "Channel";
  return type as ConnectorType;
}
