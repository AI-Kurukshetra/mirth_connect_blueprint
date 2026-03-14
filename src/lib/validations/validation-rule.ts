import { z } from "zod";

const messageFormats = ["HL7v2", "HL7v3", "FHIR_R4", "FHIR_R5", "JSON", "XML", "CSV"] as const;
const ruleTypes = ["schema", "required_fields", "format", "custom"] as const;
const severities = ["error", "warning", "info"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const validationRuleSchema = z.object({
  ruleId: z.string().trim().min(5, "Rule ID is required.").max(24, "Keep the rule ID under 24 characters."),
  name: z.string().trim().min(3, "Name must be at least 3 characters.").max(80, "Keep the name under 80 characters."),
  description: z.string().trim().max(240, "Keep the description under 240 characters."),
  messageFormat: z.enum(messageFormats),
  ruleType: z.enum(ruleTypes),
  severity: z.enum(severities),
  isActive: z.boolean(),
  ruleDefinition: z.string().trim().min(2, "Add a JSON rule definition before saving.").superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!isRecord(parsed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rule definition must be a JSON object." });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rule definition must be valid JSON." });
    }
  }),
});

export type ValidationRuleInput = z.infer<typeof validationRuleSchema>;
export const validationRuleFormats = messageFormats;
export const validationRuleTypes = ruleTypes;
export const validationRuleSeverities = severities;
