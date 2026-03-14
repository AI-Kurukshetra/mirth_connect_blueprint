import { describe, expect, it } from "vitest";

import { buildChannelHealthRows, buildMonitoringHeatmap, buildMonitoringSummary, computePercentile } from "./monitoring";

describe("monitoring helpers", () => {
  it("computes percentiles from observed values", () => {
    expect(computePercentile([54.2, 58.9, 61.3, 65.8, 67.4, 72.1], 95)).toBe(72.1);
    expect(computePercentile([54.2, 58.9, 61.3, 65.8, 67.4, 72.1], 99)).toBe(72.1);
  });

  it("builds monitoring summary values", () => {
    const summary = buildMonitoringSummary(
      [{ id: "1", recorded_at: new Date().toISOString(), messages_total: 100, messages_success: 92, messages_failed: 8, avg_latency_ms: 56, throughput_per_min: 2.6, cpu_usage_pct: 33, memory_usage_pct: 44, active_channels: 5 }],
      [{ id: "1", connector_id: "CON-1", name: "REST", type: "REST", direction: "destination", host: "api", port: 443, auth_method: "token", status: "connected", last_ping: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
      [{ id: "1", message_id: "MSG-1", channel_id: "c1", source_system: "Epic", destination_system: "Lab", message_type: "ADT^A01", message_format: "HL7v2", status: "queued", raw_payload: null, transformed_payload: null, error_message: null, retry_attempts: 0, processing_time_ms: null, created_at: new Date().toISOString() }],
      [{ id: "1", message_id: null, channel_id: "c1", error_code: "ERR", error_type: "network", error_message: "offline", resolved: false, created_at: new Date().toISOString() }],
    );

    expect(summary.successRate).toBe(92);
    expect(summary.queueDepth).toBe(1);
    expect(summary.openIncidents).toBe(1);
    expect(summary.connectorReadiness).toBe(100);
  });

  it("builds a heatmap row set for every metric family", () => {
    const heatmap = buildMonitoringHeatmap([
      { id: "1", recorded_at: new Date().toISOString(), messages_total: 100, messages_success: 92, messages_failed: 8, avg_latency_ms: 56, throughput_per_min: 2.6, cpu_usage_pct: 33, memory_usage_pct: 44, active_channels: 5 },
      { id: "2", recorded_at: new Date().toISOString(), messages_total: 120, messages_success: 110, messages_failed: 10, avg_latency_ms: 61, throughput_per_min: 3.1, cpu_usage_pct: 40, memory_usage_pct: 48, active_channels: 6 },
    ]);

    expect(heatmap).toHaveLength(6);
    expect(heatmap[0]?.cells).toHaveLength(2);
  });

  it("scores unhealthy channels lower than healthy ones", () => {
    const rows = buildChannelHealthRows(
      [
        { id: "c1", channel_id: "CH-001", name: "Healthy", description: null, source_type: "MLLP", destination_type: "REST", message_format: "HL7v2", status: "active", retry_count: 3, retry_interval: 60, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: "c2", channel_id: "CH-002", name: "Broken", description: null, source_type: "MLLP", destination_type: "TCP", message_format: "HL7v2", status: "error", retry_count: 3, retry_interval: 60, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
      [
        { id: "x1", connector_id: "CON-1", name: "MLLP In", type: "MLLP", direction: "source", host: "10.0.0.1", port: 2575, auth_method: "certificate", status: "connected", last_ping: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: "x2", connector_id: "CON-2", name: "TCP Out", type: "TCP", direction: "destination", host: "10.0.0.2", port: 2576, auth_method: "certificate", status: "error", last_ping: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
      [
        { id: "m1", message_id: "MSG-1", channel_id: "c1", source_system: "Epic", destination_system: "Lab", message_type: "ADT^A01", message_format: "HL7v2", status: "processed", raw_payload: null, transformed_payload: null, error_message: null, retry_attempts: 0, processing_time_ms: 40, created_at: new Date().toISOString() },
        { id: "m2", message_id: "MSG-2", channel_id: "c2", source_system: "Epic", destination_system: "Pharmacy", message_type: "RDS^O13", message_format: "HL7v2", status: "failed", raw_payload: null, transformed_payload: null, error_message: "offline", retry_attempts: 3, processing_time_ms: null, created_at: new Date().toISOString() },
      ],
      [{ id: "e1", message_id: "m2", channel_id: "c2", error_code: "ERR", error_type: "network", error_message: "offline", resolved: false, created_at: new Date().toISOString() }],
    );

    expect(rows[0]?.channelId).toBe("CH-002");
    expect(rows[0]?.healthScore).toBeLessThan(rows[1]?.healthScore ?? 100);
  });
});