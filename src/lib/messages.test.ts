import { describe, expect, it } from "vitest";

import { getMessageArchiveInfo, summarizeMessages } from "./messages";

describe("message helpers", () => {
  it("extracts archive metadata safely", () => {
    expect(getMessageArchiveInfo({
      status: "archived",
      custom_metadata: {
        archivedAt: "2026-03-14T10:00:00.000Z",
        archivedBy: "operator-1",
        archiveReason: "Manual archive",
        previousStatus: "failed",
      },
    })).toEqual({
      archivedAt: "2026-03-14T10:00:00.000Z",
      archivedBy: "operator-1",
      archiveReason: "Manual archive",
      previousStatus: "failed",
    });
  });

  it("summarizes archived, failed, and inflight traffic", () => {
    const summary = summarizeMessages([
      { id: "1", message_id: "m1", channel_id: null, source_system: "a", destination_system: "b", message_type: "ADT", message_format: "HL7v2", status: "archived", raw_payload: null, transformed_payload: null, error_message: null, retry_attempts: 0, processing_time_ms: null, created_at: new Date().toISOString() },
      { id: "2", message_id: "m2", channel_id: null, source_system: "a", destination_system: "b", message_type: "ADT", message_format: "HL7v2", status: "failed", raw_payload: null, transformed_payload: null, error_message: null, retry_attempts: 0, processing_time_ms: null, created_at: new Date().toISOString() },
      { id: "3", message_id: "m3", channel_id: null, source_system: "a", destination_system: "b", message_type: "ADT", message_format: "HL7v2", status: "queued", raw_payload: null, transformed_payload: null, error_message: null, retry_attempts: 0, processing_time_ms: null, created_at: new Date().toISOString() },
    ]);

    expect(summary).toEqual({ archived: 1, failed: 1, inflight: 1, total: 3 });
  });
});