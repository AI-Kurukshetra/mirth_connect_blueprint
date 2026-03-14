import { describe, expect, it } from "vitest";

import { connectorSchema } from "./connector";

const validInput = {
  connectorId: "CON-777",
  name: "Epic Intake",
  type: "MLLP",
  direction: "source",
  host: "10.0.10.5",
  port: 2575,
  pathOrQueue: "",
  authMethod: "certificate",
  status: "connected",
} as const;

describe("connectorSchema", () => {
  it("accepts a valid connector payload", () => {
    const result = connectorSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("requires a host for networked connectors", () => {
    const result = connectorSchema.safeParse({ ...validInput, host: "" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.host).toBeDefined();
  });

  it("requires a path or queue for file connectors", () => {
    const result = connectorSchema.safeParse({ ...validInput, type: "File", host: "", port: Number.NaN, pathOrQueue: "" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.pathOrQueue).toBeDefined();
  });
});