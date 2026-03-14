import { z } from "zod";

export const channelSchema = z.object({
  channelId: z.string().min(5, "Channel ID is required."),
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(12, "Add a concise operational description."),
  sourceType: z.enum(["MLLP", "HTTP", "SFTP", "TCP", "REST"]),
  destinationType: z.enum(["Database", "HTTP", "REST", "SFTP", "TCP", "MLLP"]),
  messageFormat: z.enum(["HL7v2", "HL7v3", "FHIR_R4", "FHIR_R5", "JSON", "XML"]),
  retryCount: z.number().int().min(0).max(10),
});

export type ChannelInput = z.infer<typeof channelSchema>;

