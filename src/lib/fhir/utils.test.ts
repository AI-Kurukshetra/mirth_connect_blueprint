import { describe, expect, it } from "vitest";

import {
  buildFhirSearchBundle,
  prepareFhirResourceForCreate,
  prepareFhirResourceForUpdate,
} from "./utils";

describe("fhir utils", () => {
  it("builds a search bundle from rows", () => {
    const bundle = buildFhirSearchBundle("Patient", [
      {
        resource_id: "pat-1",
        resource_data: { resourceType: "Patient", id: "pat-1" },
      },
    ], 1);

    expect(bundle.total).toBe(1);
    expect(bundle.entry[0]?.fullUrl).toBe("/fhir/Patient/pat-1");
  });

  it("prepares create payload with generated metadata", () => {
    const prepared = prepareFhirResourceForCreate("Observation", {
      status: "final",
      meta: { versionId: "2" },
    });

    expect(prepared.version).toBe(2);
    expect(prepared.resourceData.resourceType).toBe("Observation");
    expect(prepared.resourceData.id).toBeTruthy();
    expect((prepared.resourceData.meta as { versionId: string }).versionId).toBe("2");
  });

  it("increments version on update", () => {
    const prepared = prepareFhirResourceForUpdate("Patient", "pat-2", {
      resourceType: "Patient",
      name: [{ family: "Doe" }],
    }, 3);

    expect(prepared.version).toBe(4);
    expect(prepared.resourceData.id).toBe("pat-2");
    expect((prepared.resourceData.meta as { versionId: string }).versionId).toBe("4");
  });
});

