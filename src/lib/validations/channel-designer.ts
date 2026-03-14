import { z } from "zod";

const jsonStringSchema = z.string().trim().refine((value) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}, "Must be a valid JSON object.");

export const channelDestinationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Destination name must be at least 2 characters."),
  enabled: z.boolean(),
  connectorType: z.string().min(1, "Choose a destination connector."),
  connectorProperties: jsonStringSchema,
  filterScript: z.string().optional(),
  transformerScript: z.string().optional(),
  responseTransformerScript: z.string().optional(),
  queueEnabled: z.boolean(),
  retryCount: z.number().int().min(0).max(10),
  retryIntervalMs: z.number().int().min(0).max(600000),
  inboundDataType: z.string().min(1, "Choose an inbound data type."),
  outboundDataType: z.string().min(1, "Choose an outbound data type."),
});

export const channelDesignerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(12, "Add a concise operational description."),
  messageFormat: z.enum(["HL7v2", "HL7v3", "FHIR_R4", "FHIR_R5", "JSON", "XML"]),
  status: z.enum(["active", "inactive", "error", "paused"]),
  retryCount: z.number().int().min(0).max(10),
  retryInterval: z.number().int().min(15).max(3600),
  sourceConnectorType: z.string().min(1, "Choose a source connector."),
  sourceConnectorProperties: jsonStringSchema,
  sourceFilterScript: z.string().optional(),
  sourceTransformerScript: z.string().optional(),
  preprocessorScript: z.string().optional(),
  postprocessorScript: z.string().optional(),
  destinations: z.array(channelDestinationSchema).min(1, "Add at least one destination lane."),
});

export type ChannelDesignerInput = z.infer<typeof channelDesignerSchema>;
export type ChannelDestinationInput = z.infer<typeof channelDestinationSchema>;
