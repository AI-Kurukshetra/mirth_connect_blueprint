import { describe, expect, it } from "vitest";

import { getErrorSeverity, summarizeErrorLogs } from "./errors";

describe("error helpers", () => {
  it("classifies critical incidents from type and message", () => {
    expect(getErrorSeverity({ error_type: "network", error_message: "Connection refused by endpoint" })).toBe("critical");
    expect(getErrorSeverity({ error_type: "auth", error_message: "Bearer token expired" })).toBe("high");
    expect(getErrorSeverity({ error_type: "validation", error_message: "PID.3 is missing" })).toBe("medium");
  });

  it("summarizes open, resolved, critical, and affected channels", () => {
    const summary = summarizeErrorLogs([
      { id: "1", message_id: "m1", channel_id: "c1", error_code: "NET-001", error_type: "network", error_message: "offline", resolved: false, created_at: new Date().toISOString() },
      { id: "2", message_id: null, channel_id: "c1", error_code: "AUTH-001", error_type: "auth", error_message: "expired token", resolved: false, created_at: new Date().toISOString() },
      { id: "3", message_id: null, channel_id: "c2", error_code: "VAL-001", error_type: "validation", error_message: "missing field", resolved: true, created_at: new Date().toISOString() },
    ]);

    expect(summary.total).toBe(3);
    expect(summary.open).toBe(2);
    expect(summary.resolved).toBe(1);
    expect(summary.critical).toBe(1);
    expect(summary.affectedChannels).toBe(1);
  });
});