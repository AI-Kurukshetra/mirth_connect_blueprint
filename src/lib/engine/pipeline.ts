/**
 * Message Processing Pipeline
 *
 * Implements the Mirth-style message processing lifecycle:
 *   Source Receives → Preprocessor → Source Filter → Source Transformer →
 *   For each Destination: Filter → Transformer → Send → Response
 *
 * Tracks message status through: RECEIVED → TRANSFORMED → SENT (or FILTERED / ERROR)
 */

import {
  createVariableMaps,
  executeScript,
  executeFilter,
  executeTransformer,
  serializeMaps,
  type VariableMaps,
  type LogEntry,
} from "./executor";
import {
  sendMessage,
  receiveMessage,
  type ConnectorResult,
} from "./connectors";

// ---- Types ----

export type MessageStatus =
  | "received"
  | "transformed"
  | "filtered"
  | "sent"
  | "queued"
  | "error"
  | "pending";

export interface DestinationResult {
  destinationId: string;
  connectorName: string;
  connectorType: string;
  status: MessageStatus;
  filtered: boolean;
  transformedContent?: string;
  encodedContent?: string;
  sentContent?: string;
  responseContent?: string;
  connectorResult?: ConnectorResult;
  error?: string;
  logs: LogEntry[];
  processingTimeMs: number;
}

export interface ProcessResult {
  messageId: string;
  channelId: string;
  status: MessageStatus;
  rawContent: string;
  preprocessedContent: string;
  transformedContent: string;
  encodedContent?: string;
  sentContent?: string;
  responseContent?: string;
  errorContent?: string;
  connectorMap: Record<string, unknown>;
  channelMap: Record<string, unknown>;
  responseMap: Record<string, unknown>;
  messageType?: string;
  dataType?: string;
  direction: string;
  processingTimeMs: number;
  logs: LogEntry[];
  destinations: DestinationResult[];
  sourceFilterPassed: boolean;
}

interface ChannelConfig {
  id: string;
  name: string;
  source_type: string;
  destination_type: string;
  message_format: string;
  source_connector_type: string;
  source_connector_properties: Record<string, unknown> | null;
  source_filter: { script?: string } | null;
  source_transformer: { script?: string } | null;
  preprocessor_script: string | null;
  postprocessor_script: string | null;
}

interface DestinationConfig {
  id: string;
  name?: string;
  connector_type: string;
  connector_properties: Record<string, unknown> | null;
  filter: { script?: string } | null;
  transformer: { script?: string } | null;
  queue_enabled?: boolean;
  retry_count?: number;
  retry_interval_ms?: number;
}

// ---- Pipeline ----

/**
 * Process a raw message through a channel's full pipeline.
 *
 * @param channelId - The channel UUID
 * @param rawMessage - The raw incoming message string
 * @param supabase - Supabase client instance
 * @returns ProcessResult with all intermediate states
 */
export async function processMessage(
  channelId: string,
  rawMessage: string,
  supabase: any
): Promise<ProcessResult> {
  const pipelineStart = Date.now();
  const allLogs: LogEntry[] = [];
  const messageId = crypto.randomUUID();

  // 1. Load channel configuration
  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .single();

  if (channelError || !channel) {
    return buildErrorResult(
      messageId,
      channelId,
      rawMessage,
      `Channel not found: ${channelError?.message || "unknown"}`,
      pipelineStart
    );
  }

  const channelConfig: ChannelConfig = channel;

  // 2. Load destinations
  const { data: destinations } = await supabase
    .from("destinations")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  const destConfigs: DestinationConfig[] = destinations || [];

  // 3. Initialize variable maps
  const maps = createVariableMaps(channelId);

  // Detect message type from content
  const messageType = detectMessageType(rawMessage);
  const dataType = detectDataType(rawMessage);

  // ---- Source Receive ----
  const { message: receivedMessage, metadata } = receiveMessage(
    channelConfig.source_connector_type || "TCP/MLLP",
    rawMessage
  );

  maps.sourceMap.set("rawData", rawMessage);
  maps.sourceMap.set("receivedData", receivedMessage);
  maps.channelMap.set("channelName", channelConfig.name);
  maps.channelMap.set("channelId", channelId);
  maps.channelMap.set("messageType", messageType);
  maps.channelMap.set("sourceMetadata", metadata);

  let currentMessage = receivedMessage;

  // ---- Preprocessor ----
  if (channelConfig.preprocessor_script) {
    const preResult = executeScript(channelConfig.preprocessor_script, currentMessage, maps);
    allLogs.push(...preResult.logs);

    if (!preResult.success) {
      const result = buildErrorResult(
        messageId,
        channelId,
        rawMessage,
        `Preprocessor error: ${preResult.error}`,
        pipelineStart
      );
      result.logs = allLogs;
      await saveMessageToDB(supabase, result, channelConfig, destConfigs);
      return result;
    }
    currentMessage = preResult.msg;
  }

  const preprocessedContent = currentMessage;

  // ---- Source Filter ----
  const filterResult = executeFilter(channelConfig.source_filter, currentMessage, maps);
  allLogs.push(...filterResult.logs);

  if (!filterResult.pass) {
    const serialized = serializeMaps(maps);
    const result: ProcessResult = {
      messageId,
      channelId,
      status: "filtered",
      rawContent: rawMessage,
      preprocessedContent,
      transformedContent: currentMessage,
      connectorMap: serialized.connectorMap,
      channelMap: serialized.channelMap,
      responseMap: serialized.responseMap,
      messageType,
      dataType,
      direction: "inbound",
      processingTimeMs: Date.now() - pipelineStart,
      logs: allLogs,
      destinations: [],
      sourceFilterPassed: false,
    };
    if (filterResult.error) {
      result.errorContent = `Source filter error: ${filterResult.error}`;
      result.status = "error";
    }
    await saveMessageToDB(supabase, result, channelConfig, destConfigs);
    return result;
  }

  // ---- Source Transformer ----
  const transformResult = executeTransformer(channelConfig.source_transformer, currentMessage, maps);
  allLogs.push(...transformResult.logs);

  if (!transformResult.success) {
    const result = buildErrorResult(
      messageId,
      channelId,
      rawMessage,
      `Source transformer error: ${transformResult.error}`,
      pipelineStart
    );
    result.preprocessedContent = preprocessedContent;
    result.logs = allLogs;
    await saveMessageToDB(supabase, result, channelConfig, destConfigs);
    return result;
  }

  currentMessage = transformResult.msg;
  const transformedContent = currentMessage;

  // ---- Destinations ----
  const destinationResults: DestinationResult[] = [];
  let overallStatus: MessageStatus = "transformed";

  for (const dest of destConfigs) {
    const destResult = await processDestination(dest, currentMessage, maps);
    allLogs.push(...destResult.logs);
    destinationResults.push(destResult);

    if (destResult.status === "sent") {
      overallStatus = "sent";
    } else if (destResult.status === "error" && overallStatus !== "sent") {
      overallStatus = "error";
    }
  }

  // If no destinations, status stays transformed
  if (destConfigs.length === 0) {
    overallStatus = "transformed";
  }

  // ---- Postprocessor ----
  if (channelConfig.postprocessor_script) {
    const postResult = executeScript(channelConfig.postprocessor_script, currentMessage, maps);
    allLogs.push(...postResult.logs);
    // Postprocessor errors are logged but don't fail the pipeline
  }

  // ---- Build final result ----
  const serialized = serializeMaps(maps);

  // Gather sent/response from first successful destination
  const firstSent = destinationResults.find((d) => d.status === "sent");

  const result: ProcessResult = {
    messageId,
    channelId,
    status: overallStatus,
    rawContent: rawMessage,
    preprocessedContent,
    transformedContent,
    encodedContent: firstSent?.encodedContent || transformedContent,
    sentContent: firstSent?.sentContent,
    responseContent: firstSent?.responseContent,
    errorContent: destinationResults.find((d) => d.error)?.error,
    connectorMap: serialized.connectorMap,
    channelMap: serialized.channelMap,
    responseMap: serialized.responseMap,
    messageType,
    dataType,
    direction: "inbound",
    processingTimeMs: Date.now() - pipelineStart,
    logs: allLogs,
    destinations: destinationResults,
    sourceFilterPassed: true,
  };

  await saveMessageToDB(supabase, result, channelConfig, destConfigs);
  return result;
}

// ---- Destination Processing ----

async function processDestination(
  dest: DestinationConfig,
  message: string,
  maps: VariableMaps
): Promise<DestinationResult> {
  const start = Date.now();
  const logs: LogEntry[] = [];
  let currentMessage = message;

  // Reset connector map for each destination
  maps.connectorMap.clear();
  maps.connectorMap.set("destinationId", dest.id);
  maps.connectorMap.set("connectorType", dest.connector_type);

  // ---- Destination Filter ----
  const filterResult = executeFilter(dest.filter, currentMessage, maps);
  logs.push(...filterResult.logs);

  if (!filterResult.pass) {
    return {
      destinationId: dest.id,
      connectorName: dest.name || dest.connector_type,
      connectorType: dest.connector_type,
      status: "filtered",
      filtered: true,
      logs,
      processingTimeMs: Date.now() - start,
      ...(filterResult.error ? { error: filterResult.error } : {}),
    };
  }

  // ---- Destination Transformer ----
  const transformResult = executeTransformer(dest.transformer, currentMessage, maps);
  logs.push(...transformResult.logs);

  if (!transformResult.success) {
    return {
      destinationId: dest.id,
      connectorName: dest.name || dest.connector_type,
      connectorType: dest.connector_type,
      status: "error",
      filtered: false,
      transformedContent: currentMessage,
      error: `Destination transformer error: ${transformResult.error}`,
      logs,
      processingTimeMs: Date.now() - start,
    };
  }

  currentMessage = transformResult.msg;
  const transformedContent = currentMessage;

  // ---- Send via Connector ----
  try {
    const connectorResult = await sendMessage(
      dest.connector_type,
      currentMessage,
      (dest.connector_properties || {}) as any
    );

    // Store response in responseMap
    maps.responseMap.set("status", connectorResult.status);
    maps.responseMap.set("statusCode", connectorResult.statusCode);
    maps.responseMap.set("response", connectorResult.response);

    if (connectorResult.status === "success") {
      return {
        destinationId: dest.id,
        connectorName: dest.name || dest.connector_type,
        connectorType: dest.connector_type,
        status: "sent",
        filtered: false,
        transformedContent,
        encodedContent: currentMessage,
        sentContent: connectorResult.sentPayload,
        responseContent: connectorResult.response,
        connectorResult,
        logs,
        processingTimeMs: Date.now() - start,
      };
    } else {
      // Queue if enabled, otherwise error
      const status: MessageStatus = dest.queue_enabled ? "queued" : "error";
      return {
        destinationId: dest.id,
        connectorName: dest.name || dest.connector_type,
        connectorType: dest.connector_type,
        status,
        filtered: false,
        transformedContent,
        encodedContent: currentMessage,
        sentContent: connectorResult.sentPayload,
        error: connectorResult.error || "Connector returned failure",
        connectorResult,
        logs,
        processingTimeMs: Date.now() - start,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      destinationId: dest.id,
      connectorName: dest.name || dest.connector_type,
      connectorType: dest.connector_type,
      status: "error",
      filtered: false,
      transformedContent,
      error: `Connector send error: ${errorMsg}`,
      logs,
      processingTimeMs: Date.now() - start,
    };
  }
}

// ---- Helpers ----

function detectMessageType(message: string): string {
  if (message.startsWith("MSH|") || message.includes("\rMSH|") || message.includes("\nMSH|")) {
    // Extract MSH.9 message type
    const lines = message.split(/\r\n|\r|\n/);
    const msh = lines.find((l) => l.startsWith("MSH"));
    if (msh) {
      const fields = msh.split("|");
      return fields[8] || "HL7"; // MSH.9 (0-indexed: MSH=0, |=1 delim, so field 8 is MSH.9)
    }
    return "HL7";
  }
  if (message.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.resourceType) return `FHIR:${parsed.resourceType}`;
      return "JSON";
    } catch {
      return "TEXT";
    }
  }
  if (message.trim().startsWith("<")) return "XML";
  if (message.includes("|") && message.includes("^")) return "HL7";
  return "TEXT";
}

function detectDataType(message: string): string {
  if (message.startsWith("MSH|")) return "HL7V2";
  if (message.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.resourceType) return "FHIR";
      return "JSON";
    } catch {
      return "RAW";
    }
  }
  if (message.trim().startsWith("<")) return "XML";
  return "RAW";
}

function normalizeMessageFormat(result: ProcessResult, channelConfig: ChannelConfig) {
  switch (result.dataType) {
    case "HL7V2":
      return "HL7v2";
    case "FHIR":
      return channelConfig.message_format.startsWith("FHIR_") ? channelConfig.message_format : "FHIR_R4";
    case "JSON":
      return "JSON";
    case "XML":
      return "XML";
    default:
      return channelConfig.message_format || "HL7v2";
  }
}

function getSourceSystem(channelConfig: ChannelConfig) {
  return channelConfig.source_type || channelConfig.source_connector_type || channelConfig.name || "Source";
}

function getDefaultDestination(channelConfig: ChannelConfig, destinations: DestinationConfig[]) {
  return destinations[0]?.name || destinations[0]?.connector_type || channelConfig.destination_type || "Destination";
}
function buildErrorResult(
  messageId: string,
  channelId: string,
  rawMessage: string,
  error: string,
  startTime: number
): ProcessResult {
  return {
    messageId,
    channelId,
    status: "error",
    rawContent: rawMessage,
    preprocessedContent: rawMessage,
    transformedContent: rawMessage,
    errorContent: error,
    connectorMap: {},
    channelMap: {},
    responseMap: {},
    messageType: detectMessageType(rawMessage),
    dataType: detectDataType(rawMessage),
    direction: "inbound",
    processingTimeMs: Date.now() - startTime,
    logs: [],
    destinations: [],
    sourceFilterPassed: false,
  };
}

async function saveMessageToDB(
  supabase: any,
  result: ProcessResult,
  channelConfig: ChannelConfig,
  destinations: DestinationConfig[]
): Promise<void> {
  try {
    const messageFormat = normalizeMessageFormat(result, channelConfig);
    const sourceSystem = getSourceSystem(channelConfig);
    const destinationSystem = getDefaultDestination(channelConfig, destinations);
    const baseMetadata = {
      pipelineMessageId: result.messageId,
      sourceFilterPassed: result.sourceFilterPassed,
      destinationCount: result.destinations.length,
    };

    const { error } = await supabase.from("messages").insert({
      message_id: result.messageId,
      channel_id: result.channelId,
      source_system: sourceSystem,
      destination_system: destinationSystem,
      message_type: result.messageType || "Unknown",
      message_format: messageFormat,
      raw_payload: result.rawContent,
      transformed_payload: result.transformedContent,
      error_message: result.errorContent || null,
      retry_attempts: 0,
      connector_name: "Source",
      status: result.status,
      raw_content: result.rawContent,
      transformed_content: result.transformedContent,
      encoded_content: result.encodedContent || null,
      sent_content: result.sentContent || null,
      response_content: result.responseContent || null,
      error_content: result.errorContent || null,
      connector_map: result.connectorMap,
      channel_map: result.channelMap,
      response_map: result.responseMap,
      data_type: result.dataType || detectDataType(result.rawContent),
      direction: result.direction,
      processing_time_ms: result.processingTimeMs,
      custom_metadata: {
        ...baseMetadata,
        logs: result.logs.slice(0, 100),
      },
    });

    if (error) {
      console.error("Failed to save message to DB:", error.message);
    }

    for (const dest of result.destinations) {
      await supabase.from("messages").insert({
        message_id: `${result.messageId}:${dest.destinationId}`,
        channel_id: result.channelId,
        source_system: channelConfig.name,
        destination_system: dest.connectorName,
        message_type: result.messageType || "Unknown",
        message_format: messageFormat,
        raw_payload: result.rawContent,
        transformed_payload: dest.transformedContent || result.transformedContent,
        error_message: dest.error || null,
        retry_attempts: 0,
        connector_name: dest.connectorName,
        status: dest.status,
        raw_content: result.rawContent,
        transformed_content: dest.transformedContent || result.transformedContent,
        encoded_content: dest.encodedContent || null,
        sent_content: dest.sentContent || null,
        response_content: dest.responseContent || null,
        error_content: dest.error || null,
        connector_map: {},
        channel_map: result.channelMap,
        response_map: result.responseMap,
        data_type: result.dataType || detectDataType(result.rawContent),
        direction: "outbound",
        processing_time_ms: dest.processingTimeMs,
        custom_metadata: {
          ...baseMetadata,
          destinationId: dest.destinationId,
          connectorType: dest.connectorType,
          filtered: dest.filtered,
          logs: dest.logs.slice(0, 50),
        },
      });
    }
  } catch (err) {
    console.error("Error saving message to database:", err);
  }
}



