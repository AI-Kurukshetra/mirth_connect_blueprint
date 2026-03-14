import { z } from "zod";

const messageFormats = ["HL7v2", "HL7v3", "FHIR_R4", "FHIR_R5", "JSON", "XML", "CSV"] as const;
const transformationLanguages = ["javascript", "xslt", "groovy", "python"] as const;

export const transformationSchema = z.object({
  transformationId: z.string().trim().min(5, "Transformation ID is required.").max(24, "Keep the transformation ID under 24 characters."),
  name: z.string().trim().min(3, "Name must be at least 3 characters.").max(80, "Keep the name under 80 characters."),
  description: z.string().trim().max(240, "Keep the description under 240 characters."),
  language: z.enum(transformationLanguages),
  inputFormat: z.enum(messageFormats),
  outputFormat: z.enum(messageFormats),
  version: z.number().int().min(1, "Version must be at least 1.").max(99, "Version must be under 100."),
  isActive: z.boolean(),
  script: z.string().trim().min(12, "Add a transformation script before saving.").max(50000, "Transformation scripts must stay under 50,000 characters."),
});

export type TransformationInput = z.infer<typeof transformationSchema>;
export const transformationFormats = messageFormats;
export const transformationLanguagesList = transformationLanguages;
