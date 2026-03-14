import { describe, expect, it } from "vitest";

import { alertSchema } from "./alert";

const validInput = {
  alertId: "ALT-777",
  name: "High queue pressure",
  description: "Pages the on-call operator when retry queues spike.",
  triggerType: "queue_depth",
  thresholdValue: 50,
  thresholdOperator: "gt",
  notificationChannel: "email",
  notificationTarget: "ops@medflow.local",
  cooldownMinutes: 15,
  isActive: true,
} as const;

describe("alertSchema", () => {
  it("accepts a valid alert payload", () => {
    const result = alertSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing threshold values", () => {
    const result = alertSchema.safeParse({ ...validInput, thresholdValue: Number.NaN });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.thresholdValue).toBeDefined();
  });

  it("validates channel-specific notification targets", () => {
    const result = alertSchema.safeParse({ ...validInput, notificationChannel: "webhook", notificationTarget: "not-a-url" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.notificationTarget).toBeDefined();
  });
});