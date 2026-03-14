import { describe, expect, it } from "vitest";

import { transformationSchema } from "./transformation";

describe("transformationSchema", () => {
  it("accepts a valid transformation", () => {
    const result = transformationSchema.safeParse({
      transformationId: "TRF-901",
      name: "ADT to FHIR mapper",
      description: "Converts inbound ADT traffic into FHIR resources.",
      language: "javascript",
      inputFormat: "HL7v2",
      outputFormat: "FHIR_R4",
      version: 1,
      isActive: true,
      script: "function transform(message) { return { ok: true, message }; }",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing identifiers", () => {
    const result = transformationSchema.safeParse({
      transformationId: "",
      name: "A",
      description: "",
      language: "javascript",
      inputFormat: "HL7v2",
      outputFormat: "FHIR_R4",
      version: 1,
      isActive: true,
      script: "function transform(message) { return message; }",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.transformationId).toBeDefined();
    expect(result.error?.flatten().fieldErrors.name).toBeDefined();
  });

  it("rejects missing scripts", () => {
    const result = transformationSchema.safeParse({
      transformationId: "TRF-902",
      name: "Result mapper",
      description: "",
      language: "python",
      inputFormat: "JSON",
      outputFormat: "FHIR_R4",
      version: 2,
      isActive: false,
      script: "short",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.script).toBeDefined();
  });
});
