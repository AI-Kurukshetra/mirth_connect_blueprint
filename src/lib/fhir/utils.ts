export interface FhirSearchRow {
  resource_id: string;
  resource_data: Record<string, unknown>;
}

function parseVersion(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function nextMeta(resource: Record<string, unknown>, version: number) {
  const meta = typeof resource.meta === "object" && resource.meta !== null
    ? resource.meta as Record<string, unknown>
    : {};

  return {
    ...meta,
    lastUpdated: new Date().toISOString(),
    versionId: String(version),
  };
}

export function buildFhirSearchBundle(resourceType: string, rows: FhirSearchRow[], total: number) {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total,
    entry: rows.map((row) => ({
      fullUrl: `/fhir/${resourceType}/${row.resource_id}`,
      resource: row.resource_data,
    })),
  };
}

export function prepareFhirResourceForCreate(resourceType: string, resource: Record<string, unknown>) {
  const resourceId = typeof resource.id === "string" && resource.id.trim()
    ? resource.id.trim()
    : crypto.randomUUID();
  const version = parseVersion((resource.meta as Record<string, unknown> | undefined)?.versionId, 1);

  const resourceData = {
    ...resource,
    id: resourceId,
    resourceType,
    meta: nextMeta(resource, version),
  };

  return {
    resourceId,
    version,
    resourceData,
  };
}

export function prepareFhirResourceForUpdate(
  resourceType: string,
  resourceId: string,
  resource: Record<string, unknown>,
  currentVersion: number,
) {
  const version = Math.max(currentVersion + 1, parseVersion((resource.meta as Record<string, unknown> | undefined)?.versionId, currentVersion + 1));

  const resourceData = {
    ...resource,
    id: resourceId,
    resourceType,
    meta: nextMeta(resource, version),
  };

  return {
    version,
    resourceData,
  };
}
