import { describe, expect, it } from "vitest";

import { validationRuleSchema } from "./validation-rule";

describe("validationRuleSchema", () => {
  it("accepts a valid validation rule", () => {
    const result = validationRuleSchema.safeParse({
      ruleId: "VAL-901",
      name: "Patient schema gate",
      description: "Confirms inbound FHIR Patient payload shape.",
      messageFormat: "FHIR_R4",
      ruleType: "schema",
      severity: "error",
      isActive: true,
      ruleDefinition: JSON.stringify({ resourceType: "Patient", required: ["id", "name"] }),
    });

    expect(result.success).toBe(true);
  });

  it("rejects malformed JSON", () => {
    const result = validationRuleSchema.safeParse({
      ruleId: "VAL-902",
      name: "HL7 field gate",
      description: "",
      messageFormat: "HL7v2",
      ruleType: "required_fields",
      severity: "warning",
      isActive: true,
      ruleDefinition: "{ bad json }",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.ruleDefinition).toBeDefined();
  });

  it("rejects non-object definitions", () => {
    const result = validationRuleSchema.safeParse({
      ruleId: "VAL-903",
      name: "Bad definition",
      description: "",
      messageFormat: "JSON",
      ruleType: "custom",
      severity: "info",
      isActive: false,
      ruleDefinition: JSON.stringify(["not", "an", "object"]),
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.ruleDefinition).toBeDefined();
  });
});
