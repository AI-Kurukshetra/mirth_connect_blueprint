import type { ErrorLogRow } from "@/types/database";

export type ErrorSeverity = "critical" | "high" | "medium" | "low";

export interface ErrorSummary {
  affectedChannels: number;
  critical: number;
  open: number;
  resolved: number;
  total: number;
}

const criticalTypes = new Set(["network", "security", "queue", "timeout"]);
const highTypes = new Set(["auth", "transform", "mapping"]);
const lowTypes = new Set(["info", "notice"]);

export function getErrorSeverity(error: Pick<ErrorLogRow, "error_type" | "error_message">): ErrorSeverity {
  const type = error.error_type.trim().toLowerCase();
  const message = error.error_message.toLowerCase();

  if (criticalTypes.has(type) || message.includes("connection refused") || message.includes("unreachable")) {
    return "critical";
  }

  if (highTypes.has(type) || message.includes("expired") || message.includes("unauthorized")) {
    return "high";
  }

  if (lowTypes.has(type)) {
    return "low";
  }

  return "medium";
}

export function summarizeErrorLogs(errors: ErrorLogRow[]): ErrorSummary {
  return {
    affectedChannels: new Set(errors.filter((error) => !error.resolved && error.channel_id).map((error) => error.channel_id)).size,
    critical: errors.filter((error) => !error.resolved && getErrorSeverity(error) === "critical").length,
    open: errors.filter((error) => !error.resolved).length,
    resolved: errors.filter((error) => error.resolved).length,
    total: errors.length,
  };
}