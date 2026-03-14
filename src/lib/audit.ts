import type { AuditLogRow } from "@/types/database";

export interface AuditSummary {
  last24Hours: number;
  systemEvents: number;
  totalEvents: number;
  uniqueEntityTypes: number;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseAuditAction(action: string) {
  const [entity = action, verb = "changed"] = action.split(".");

  return {
    entity,
    label: `${titleCase(entity)} ${titleCase(verb).toLowerCase()}`,
    verb,
    verbLabel: titleCase(verb),
  };
}

export function summarizeAuditLogs(logs: AuditLogRow[]): AuditSummary {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  return {
    last24Hours: logs.filter((log) => new Date(log.created_at).getTime() >= cutoff).length,
    systemEvents: logs.filter((log) => !log.user_id).length,
    totalEvents: logs.length,
    uniqueEntityTypes: new Set(logs.map((log) => log.entity_type)).size,
  };
}

export function toAuditDetailEntries(details: Record<string, unknown> | null | undefined) {
  if (!details) {
    return [] as Array<{ key: string; label: string; value: string }>;
  }

  return Object.entries(details).map(([key, value]) => ({
    key,
    label: titleCase(key),
    value: typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value),
  }));
}

export function buildAuditEntityHref(log: Pick<AuditLogRow, "entity_type" | "entity_id">) {
  if (!log.entity_id) {
    return null;
  }

  switch (log.entity_type) {
    case "channel":
      return `/channels/${log.entity_id}`;
    case "message":
      return `/messages/${log.entity_id}`;
    case "connector":
      return `/connectors/${log.entity_id}/edit`;
    case "transformation":
      return `/transformations/${log.entity_id}/edit`;
    case "validation_rule":
      return `/validation-rules/${log.entity_id}/edit`;
    case "routing_rule":
      return `/routing-rules/${log.entity_id}/edit`;
    case "alert":
      return `/alerts/${log.entity_id}/edit`;
    default:
      return null;
  }
}