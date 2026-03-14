import { channelDesignerSchema } from "./channel-designer";

describe("channelDesignerSchema", () => {
  it("accepts a valid designer payload", () => {
    expect(channelDesignerSchema.safeParse({
      name: "ADT Feed",
      description: "Routes ADT traffic to the downstream lab platform.",
      messageFormat: "HL7v2",
      status: "active",
      retryCount: 3,
      retryInterval: 60,
      sourceConnectorType: "tcp_listener",
      sourceConnectorProperties: "{}",
      sourceFilterScript: "",
      sourceTransformerScript: "",
      preprocessorScript: "",
      postprocessorScript: "",
      destinations: [{
        name: "Lab Writer",
        enabled: true,
        connectorType: "http_sender",
        connectorProperties: "{}",
        filterScript: "",
        transformerScript: "",
        responseTransformerScript: "",
        queueEnabled: false,
        retryCount: 0,
        retryIntervalMs: 10000,
        inboundDataType: "hl7v2",
        outboundDataType: "json",
      }],
    }).success).toBe(true);
  });

  it("rejects invalid json connector properties", () => {
    const result = channelDesignerSchema.safeParse({
      name: "ADT Feed",
      description: "Routes ADT traffic to the downstream lab platform.",
      messageFormat: "HL7v2",
      status: "active",
      retryCount: 3,
      retryInterval: 60,
      sourceConnectorType: "tcp_listener",
      sourceConnectorProperties: "not json",
      sourceFilterScript: "",
      sourceTransformerScript: "",
      preprocessorScript: "",
      postprocessorScript: "",
      destinations: [{
        name: "Lab Writer",
        enabled: true,
        connectorType: "http_sender",
        connectorProperties: "{}",
        filterScript: "",
        transformerScript: "",
        responseTransformerScript: "",
        queueEnabled: false,
        retryCount: 0,
        retryIntervalMs: 10000,
        inboundDataType: "hl7v2",
        outboundDataType: "json",
      }],
    });

    expect(result.success).toBe(false);
  });
});
