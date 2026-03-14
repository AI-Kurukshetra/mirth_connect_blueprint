import { describe, expect, it } from "vitest";

import { routingRuleSchema } from "./routing-rule";

describe("routingRuleSchema", () => {
  it("accepts a valid routing rule", () => {
    const result = routingRuleSchema.safeParse({
      ruleId: "RR-901",
      name: "Route ADT to FHIR sync",
      description: "Routes admission traffic into the downstream sync lane.",
      channelId: "CH-001",
      priority: 1,
      conditionType: "message_type",
      conditionField: "MSH.9",
      conditionOperator: "equals",
      conditionValue: "ADT^A01",
      action: "route_to",
      destinationChannelId: "CH-003",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("requires a destination channel for route actions", () => {
    const result = routingRuleSchema.safeParse({
      ruleId: "RR-902",
      name: "Missing destination",
      description: "",
      channelId: "CH-001",
      priority: 2,
      conditionType: "field_value",
      conditionField: "MSH.11",
      conditionOperator: "equals",
      conditionValue: "P",
      action: "route_to",
      destinationChannelId: "",
      isActive: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.destinationChannelId).toBeDefined();
  });

  it("rejects identical source and destination channels", () => {
    const result = routingRuleSchema.safeParse({
      ruleId: "RR-903",
      name: "Loopback rule",
      description: "",
      channelId: "CH-001",
      priority: 3,
      conditionType: "source",
      conditionField: "destination_system",
      conditionOperator: "contains",
      conditionValue: "Epic",
      action: "duplicate",
      destinationChannelId: "CH-001",
      isActive: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.destinationChannelId).toBeDefined();
  });
});
