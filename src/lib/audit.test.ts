import { describe, expect, it } from "vitest";

import { buildAuditEntityHref, parseAuditAction, summarizeAuditLogs, toAuditDetailEntries } from "./audit";

describe("audit helpers", () => {
  it("parses audit action labels", () => {
    const action = parseAuditAction("connector.tested");
    expect(action.entity).toBe("connector");
    expect(action.verb).toBe("tested");
    expect(action.label).toBe("Connector tested");
  });

  it("summarizes total and 24-hour activity", () => {
    const summary = summarizeAuditLogs([
      { id: "1", user_id: null, action: "connector.tested", entity_type: "connector", entity_id: "CON-001", created_at: new Date().toISOString() },
      { id: "2", user_id: "user-1", action: "alert.created", entity_type: "alert", entity_id: "ALT-001", created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
    ]);

    expect(summary.totalEvents).toBe(2);
    expect(summary.last24Hours).toBe(1);
    expect(summary.systemEvents).toBe(1);
    expect(summary.uniqueEntityTypes).toBe(2);
  });

  it("formats detail entries for rendering", () => {
    const details = toAuditDetailEntries({ retry_count: 3, simulated: true });
    expect(details).toEqual([
      { key: "retry_count", label: "Retry Count", value: "3" },
      { key: "simulated", label: "Simulated", value: "true" },
    ]);
  });

  it("builds entity links for known audit targets", () => {
    expect(buildAuditEntityHref({ entity_type: "alert", entity_id: "ALT-001" })).toBe("/alerts/ALT-001/edit");
    expect(buildAuditEntityHref({ entity_type: "unknown", entity_id: "X-1" })).toBeNull();
  });
});