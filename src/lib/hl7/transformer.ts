/**
 * HL7 v2.x to FHIR R4 Transformer
 * Converts parsed HL7 messages into FHIR R4 JSON resources.
 */

import { parseHL7, type HL7Message, type HL7Segment } from "./parser";

// ---- FHIR Resource Types ----

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    source?: string;
    profile?: string[];
  };
  [key: string]: unknown;
}

export interface FHIRBundle {
  resourceType: "Bundle";
  type: "transaction" | "collection" | "searchset";
  entry: Array<{
    fullUrl?: string;
    resource: FHIRResource;
    request?: {
      method: string;
      url: string;
    };
  }>;
}

export interface TransformResult {
  success: boolean;
  messageType: string;
  bundle: FHIRBundle;
  resources: FHIRResource[];
  errors: string[];
}

// ---- Helper Functions ----

function generateId(): string {
  return crypto.randomUUID();
}

/** Parse HL7 date (YYYYMMDD or YYYYMMDDHHmmss) to ISO string */
function hl7DateToISO(hl7Date: string): string | undefined {
  if (!hl7Date || hl7Date.length < 8) return undefined;
  const year = hl7Date.substring(0, 4);
  const month = hl7Date.substring(4, 6);
  const day = hl7Date.substring(6, 8);

  if (hl7Date.length >= 14) {
    const hour = hl7Date.substring(8, 10);
    const min = hl7Date.substring(10, 12);
    const sec = hl7Date.substring(12, 14);
    return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
  }
  return `${year}-${month}-${day}`;
}

/** Parse HL7 name field (Family^Given^Middle^Suffix^Prefix) */
function parseHL7Name(raw: string): { family: string; given: string[]; prefix?: string; suffix?: string } | undefined {
  if (!raw) return undefined;
  const parts = raw.split("^");
  const family = parts[0] || "";
  const given: string[] = [];
  if (parts[1]) given.push(parts[1]);
  if (parts[2]) given.push(parts[2]);
  return {
    family,
    given,
    prefix: parts[4] || undefined,
    suffix: parts[3] || undefined,
  };
}

/** Parse HL7 address field */
function parseHL7Address(raw: string) {
  if (!raw) return undefined;
  const parts = raw.split("^");
  return {
    line: parts[0] ? [parts[0]] : undefined,
    city: parts[2] || undefined,
    state: parts[3] || undefined,
    postalCode: parts[4] || undefined,
    country: parts[5] || undefined,
  };
}

/** Map HL7 sex code to FHIR gender */
function mapGender(hl7Sex: string): string {
  const map: Record<string, string> = {
    M: "male",
    F: "female",
    O: "other",
    U: "unknown",
    A: "other",
    N: "unknown",
  };
  return map[hl7Sex] || "unknown";
}

/** Map HL7 patient class to FHIR encounter class */
function mapEncounterClass(patientClass: string): { system: string; code: string; display: string } {
  const map: Record<string, { code: string; display: string }> = {
    I: { code: "IMP", display: "inpatient encounter" },
    O: { code: "AMB", display: "ambulatory" },
    E: { code: "EMER", display: "emergency" },
    P: { code: "PRENC", display: "pre-admission" },
    R: { code: "IMP", display: "inpatient encounter" },
    B: { code: "OBSENC", display: "observation encounter" },
  };
  const mapped = map[patientClass] || { code: "AMB", display: "ambulatory" };
  return {
    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    ...mapped,
  };
}

// ---- Segment to Resource Transformers ----

function pidToPatient(pid: HL7Segment): FHIRResource {
  const patientId = generateId();

  const name = parseHL7Name(pid.getValue(5));
  const address = parseHL7Address(pid.getValue(11));
  const dob = hl7DateToISO(pid.getValue(7));
  const gender = mapGender(pid.getValue(8));

  // Parse identifiers from PID.3
  const identifiers: Array<{ system?: string; value: string; type?: { coding: Array<{ system: string; code: string }> } }> = [];
  const pid3 = pid.getValue(3);
  if (pid3) {
    const reps = pid3.split("~");
    for (const rep of reps) {
      const parts = rep.split("^");
      const value = parts[0];
      const authority = parts[3] || "";
      const typeCode = parts[4] || "";
      if (value) {
        identifiers.push({
          system: authority ? `urn:oid:${authority}` : undefined,
          value,
          type: typeCode
            ? {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                    code: typeCode,
                  },
                ],
              }
            : undefined,
        });
      }
    }
  }

  // Phone numbers
  const telecom: Array<{ system: string; value: string; use: string }> = [];
  const homePhone = pid.getValue(13);
  if (homePhone) {
    telecom.push({ system: "phone", value: homePhone, use: "home" });
  }
  const workPhone = pid.getValue(14);
  if (workPhone) {
    telecom.push({ system: "phone", value: workPhone, use: "work" });
  }

  // Marital status
  const maritalRaw = pid.getValue(16);
  let maritalStatus;
  if (maritalRaw) {
    const parts = maritalRaw.split("^");
    maritalStatus = {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
          code: parts[0],
          display: parts[1] || undefined,
        },
      ],
    };
  }

  const patient: FHIRResource = {
    resourceType: "Patient",
    id: patientId,
    meta: {
      source: "hl7v2-transform",
      lastUpdated: new Date().toISOString(),
    },
    identifier: identifiers.length > 0 ? identifiers : undefined,
    name: name ? [{ family: name.family, given: name.given, prefix: name.prefix ? [name.prefix] : undefined, suffix: name.suffix ? [name.suffix] : undefined }] : undefined,
    gender,
    birthDate: dob,
    address: address ? [address] : undefined,
    telecom: telecom.length > 0 ? telecom : undefined,
    maritalStatus,
  };

  return patient;
}

function pv1ToEncounter(pv1: HL7Segment, patientId: string): FHIRResource {
  const encounterId = generateId();
  const patientClass = pv1.getValue(2);
  const location = pv1.getValue(3);
  const admitDate = hl7DateToISO(pv1.getValue(44));
  const dischargeDate = hl7DateToISO(pv1.getValue(45));

  // Parse location
  const locationParts = location ? location.split("^") : [];
  const locationDisplay = locationParts.filter((p) => p).join(" - ");

  // Parse attending doctor
  const attendingRaw = pv1.getValue(7);
  let participant;
  if (attendingRaw) {
    const name = parseHL7Name(attendingRaw);
    if (name) {
      participant = [
        {
          type: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                  code: "ATND",
                  display: "attender",
                },
              ],
            },
          ],
          individual: {
            display: `${name.given.join(" ")} ${name.family}`.trim(),
          },
        },
      ];
    }
  }

  const encounter: FHIRResource = {
    resourceType: "Encounter",
    id: encounterId,
    meta: {
      source: "hl7v2-transform",
      lastUpdated: new Date().toISOString(),
    },
    status: dischargeDate ? "finished" : "in-progress",
    class: mapEncounterClass(patientClass),
    subject: {
      reference: `Patient/${patientId}`,
    },
    participant,
    location: locationDisplay
      ? [
          {
            location: {
              display: locationDisplay,
            },
          },
        ]
      : undefined,
    period: {
      start: admitDate,
      end: dischargeDate,
    },
  };

  return encounter;
}

function obxToObservation(obx: HL7Segment, patientId: string): FHIRResource {
  const obsId = generateId();
  const valueType = obx.getValue(2);
  const obsIdentifier = obx.getValue(3);
  const obsValue = obx.getValue(5);
  const units = obx.getValue(6);
  const refRange = obx.getValue(7);
  const abnormalFlag = obx.getValue(8);
  const status = obx.getValue(11);
  const obsDateTime = hl7DateToISO(obx.getValue(14));

  // Parse observation identifier (code^display^system)
  const idParts = obsIdentifier ? obsIdentifier.split("^") : [];
  const code = {
    coding: [
      {
        system: idParts[2] ? `urn:oid:${idParts[2]}` : "http://loinc.org",
        code: idParts[0] || "",
        display: idParts[1] || idParts[0] || "",
      },
    ],
    text: idParts[1] || idParts[0] || "",
  };

  // Map status
  const statusMap: Record<string, string> = {
    F: "final",
    P: "preliminary",
    C: "corrected",
    I: "registered",
    R: "preliminary",
    D: "cancelled",
    X: "cancelled",
  };

  // Build value
  let valueQuantity;
  let valueString;
  if (valueType === "NM" && obsValue) {
    valueQuantity = {
      value: parseFloat(obsValue),
      unit: units || undefined,
      system: "http://unitsofmeasure.org",
    };
  } else if (obsValue) {
    valueString = obsValue;
  }

  // Reference range
  let referenceRange;
  if (refRange) {
    const rangeParts = refRange.split("-");
    referenceRange = [
      {
        low: rangeParts[0] ? { value: parseFloat(rangeParts[0]), unit: units } : undefined,
        high: rangeParts[1] ? { value: parseFloat(rangeParts[1]), unit: units } : undefined,
        text: refRange,
      },
    ];
  }

  // Interpretation
  let interpretation;
  if (abnormalFlag) {
    const flagMap: Record<string, { code: string; display: string }> = {
      H: { code: "H", display: "High" },
      L: { code: "L", display: "Low" },
      HH: { code: "HH", display: "Critical High" },
      LL: { code: "LL", display: "Critical Low" },
      N: { code: "N", display: "Normal" },
      A: { code: "A", display: "Abnormal" },
    };
    const mapped = flagMap[abnormalFlag] || { code: abnormalFlag, display: abnormalFlag };
    interpretation = [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            code: mapped.code,
            display: mapped.display,
          },
        ],
      },
    ];
  }

  const observation: FHIRResource = {
    resourceType: "Observation",
    id: obsId,
    meta: {
      source: "hl7v2-transform",
      lastUpdated: new Date().toISOString(),
    },
    status: statusMap[status] || "unknown",
    code,
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: obsDateTime,
    valueQuantity,
    valueString: valueQuantity ? undefined : valueString,
    referenceRange,
    interpretation,
  };

  return observation;
}

function obrToDiagnosticReport(
  obr: HL7Segment,
  patientId: string,
  observationIds: string[]
): FHIRResource {
  const reportId = generateId();
  const placerOrder = obr.getValue(2);
  const fillerOrder = obr.getValue(3);
  const serviceId = obr.getValue(4);
  const obsDateTime = hl7DateToISO(obr.getValue(7));
  const resultStatus = obr.getValue(25);

  const idParts = serviceId ? serviceId.split("^") : [];

  const statusMap: Record<string, string> = {
    F: "final",
    P: "preliminary",
    C: "corrected",
    I: "registered",
    R: "partial",
    A: "partial",
  };

  const report: FHIRResource = {
    resourceType: "DiagnosticReport",
    id: reportId,
    meta: {
      source: "hl7v2-transform",
      lastUpdated: new Date().toISOString(),
    },
    status: statusMap[resultStatus] || "unknown",
    code: {
      coding: [
        {
          system: idParts[2] ? `urn:oid:${idParts[2]}` : "http://loinc.org",
          code: idParts[0] || "",
          display: idParts[1] || idParts[0] || "",
        },
      ],
      text: idParts[1] || idParts[0] || "",
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: obsDateTime,
    identifier: [
      ...(placerOrder ? [{ type: { text: "Placer" }, value: placerOrder.split("^")[0] }] : []),
      ...(fillerOrder ? [{ type: { text: "Filler" }, value: fillerOrder.split("^")[0] }] : []),
    ],
    result: observationIds.map((id) => ({
      reference: `Observation/${id}`,
    })),
  };

  return report;
}

// ---- Main Transform Functions ----

function transformADT(msg: HL7Message): TransformResult {
  const resources: FHIRResource[] = [];
  const errors: string[] = [];

  // Transform PID -> Patient
  const pid = msg.getSegment("PID");
  if (!pid) {
    errors.push("PID segment not found - cannot create Patient resource");
    return { success: false, messageType: msg.messageType, bundle: createBundle([]), resources: [], errors };
  }

  const patient = pidToPatient(pid);
  resources.push(patient);

  // Transform PV1 -> Encounter
  const pv1 = msg.getSegment("PV1");
  if (pv1) {
    const encounter = pv1ToEncounter(pv1, patient.id!);
    resources.push(encounter);
  }

  return {
    success: errors.length === 0,
    messageType: msg.messageType,
    bundle: createBundle(resources),
    resources,
    errors,
  };
}

function transformORU(msg: HL7Message): TransformResult {
  const resources: FHIRResource[] = [];
  const errors: string[] = [];

  // Transform PID -> Patient
  const pid = msg.getSegment("PID");
  if (!pid) {
    errors.push("PID segment not found");
    return { success: false, messageType: msg.messageType, bundle: createBundle([]), resources: [], errors };
  }

  const patient = pidToPatient(pid);
  resources.push(patient);

  // Group OBX segments under their preceding OBR
  const segments = msg.segments;
  let currentOBR: HL7Segment | null = null;
  let currentOBXs: HL7Segment[] = [];

  const obrGroups: Array<{ obr: HL7Segment; obxs: HL7Segment[] }> = [];

  for (const seg of segments) {
    if (seg.name === "OBR") {
      if (currentOBR) {
        obrGroups.push({ obr: currentOBR, obxs: currentOBXs });
      }
      currentOBR = seg;
      currentOBXs = [];
    } else if (seg.name === "OBX") {
      currentOBXs.push(seg);
    }
  }
  if (currentOBR) {
    obrGroups.push({ obr: currentOBR, obxs: currentOBXs });
  }

  // Transform each OBR group
  for (const group of obrGroups) {
    const observations: FHIRResource[] = [];
    for (const obx of group.obxs) {
      const obs = obxToObservation(obx, patient.id!);
      observations.push(obs);
      resources.push(obs);
    }

    const report = obrToDiagnosticReport(
      group.obr,
      patient.id!,
      observations.map((o) => o.id!)
    );
    resources.push(report);
  }

  return {
    success: errors.length === 0,
    messageType: msg.messageType,
    bundle: createBundle(resources),
    resources,
    errors,
  };
}

function transformORM(msg: HL7Message): TransformResult {
  // ORM is similar structure - create Patient and ServiceRequests
  const resources: FHIRResource[] = [];
  const errors: string[] = [];

  const pid = msg.getSegment("PID");
  if (!pid) {
    errors.push("PID segment not found");
    return { success: false, messageType: msg.messageType, bundle: createBundle([]), resources: [], errors };
  }

  const patient = pidToPatient(pid);
  resources.push(patient);

  // Each OBR becomes a ServiceRequest
  const obrSegments = msg.getSegments("OBR");
  for (const obr of obrSegments) {
    const serviceId = obr.getValue(4);
    const idParts = serviceId ? serviceId.split("^") : [];
    const placerOrder = obr.getValue(2);
    const orderDateTime = hl7DateToISO(obr.getValue(7));

    const serviceRequest: FHIRResource = {
      resourceType: "ServiceRequest",
      id: generateId(),
      meta: {
        source: "hl7v2-transform",
        lastUpdated: new Date().toISOString(),
      },
      status: "active",
      intent: "order",
      code: {
        coding: [
          {
            system: idParts[2] ? `urn:oid:${idParts[2]}` : "http://loinc.org",
            code: idParts[0] || "",
            display: idParts[1] || idParts[0] || "",
          },
        ],
        text: idParts[1] || idParts[0] || "",
      },
      subject: {
        reference: `Patient/${patient.id}`,
      },
      authoredOn: orderDateTime,
      identifier: placerOrder
        ? [{ type: { text: "Placer" }, value: placerOrder.split("^")[0] }]
        : undefined,
    };

    resources.push(serviceRequest);
  }

  return {
    success: errors.length === 0,
    messageType: msg.messageType,
    bundle: createBundle(resources),
    resources,
    errors,
  };
}

function createBundle(resources: FHIRResource[]): FHIRBundle {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: resources.map((resource) => ({
      fullUrl: `urn:uuid:${resource.id}`,
      resource,
      request: {
        method: "POST",
        url: resource.resourceType,
      },
    })),
  };
}

/**
 * Transform a parsed HL7 message to FHIR R4 resources.
 */
export function transformHL7ToFHIR(msg: HL7Message): TransformResult {
  const msgType = msg.messageType;
  const typeCode = msgType.split("^")[0];

  switch (typeCode) {
    case "ADT":
      return transformADT(msg);
    case "ORU":
      return transformORU(msg);
    case "ORM":
      return transformORM(msg);
    default:
      return {
        success: false,
        messageType: msgType,
        bundle: createBundle([]),
        resources: [],
        errors: [`Unsupported message type for transformation: "${msgType}". Supported: ADT, ORU, ORM`],
      };
  }
}

/**
 * Transform raw HL7 text to FHIR R4 resources.
 */
export function transformRawHL7ToFHIR(raw: string): TransformResult {
  const msg = parseHL7(raw);
  return transformHL7ToFHIR(msg);
}
