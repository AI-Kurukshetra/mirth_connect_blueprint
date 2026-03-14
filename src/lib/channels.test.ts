import { describe, expect, it } from "vitest";

import { buildChannelRuntimeSnapshot, describeChannelHealth } from "./channels";

describe("channel helpers", () => {
  it("maps health scores to stable, watch, and critical states", () => {
    expect(describeChannelHealth(88)).toEqual({ label: "stable", tone: "good" });
    expect(describeChannelHealth(67)).toEqual({ label: "watch", tone: "gold" });
    expect(describeChannelHealth(22)).toEqual({ label: "critical", tone: "warm" });
  });

  it("builds a channel runtime snapshot from messages, connectors, and errors", () => {
    const snapshot = buildChannelRuntimeSnapshot(
      { id: "c1", source_type: "MLLP", destination_type: "REST" },
      [
        { id: "1", message_id: "m1", channel_id: "c1", source_system: "Epic", destination_system: "Lab", message_type: "ADT", message_format: "HL7v2", status: "processed", raw_payload: null, transformed_payload: null, error_message: null, retry_attempts: 0, processing_time_ms: 40, created_at: new Date().toISOString() },
        { id: "2", message_id: "m2", channel_id: "c1", source_system: "Epic", destination_system: "Lab", message_type: "ADT", message_format: "HL7v2", status: "archived", raw_payload: null, transformed_payload: null, error_message: null, retry_attempts: 0, processing_time_ms: 60, created_at: new Date(Date.now() - 1000).toISOString() },
        { id: "3", message_id: "m3", channel_id: "c1", source_system: "Epic", destination_system: "Lab", message_type: "ADT", message_format: "HL7v2", status: "queued", raw_payload: null, transformed_payload: null, error_message: null, retry_attempts: 0, processing_time_ms: null, created_at: new Date(Date.now() - 2000).toISOString() },
      ],
      [{ id: "e1", message_id: null, channel_id: "c1", error_code: "ERR", error_type: "network", error_message: "offline", resolved: false, created_at: new Date().toISOString() }],
      [
        { id: "k1", connector_id: "CON-1", name: "Source", type: "MLLP", direction: "source", host: null, port: null, auth_method: null, status: "connected", last_ping: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: "k2", connector_id: "CON-2", name: "Dest", type: "REST", direction: "destination", host: null, port: null, auth_method: null, status: "error", last_ping: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
    );

    expect(snapshot.archived).toBe(1);
    expect(snapshot.inflight).toBe(1);
    expect(snapshot.processed).toBe(1);
    expect(snapshot.openIncidents).toBe(1);
    expect(snapshot.endpointReadiness).toBe(50);
    expect(snapshot.recentVolume).toBe(3);
  });
});