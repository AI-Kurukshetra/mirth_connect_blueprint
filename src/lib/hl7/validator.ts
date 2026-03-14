/**
 * HL7 v2.x Message Validator
 */

import { parseHL7, type HL7Message } from "./parser";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationResult {
  severity: ValidationSeverity;
  segment?: string;
  field?: number;
  message: string;
  code: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  infos: ValidationResult[];
  all: ValidationResult[];
}

// Valid HL7 message types
const VALID_MESSAGE_TYPES: Record<string, string[]> = {
  ADT: ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A11", "A12", "A13", "A28", "A31", "A40"],
  ORM: ["O01"],
  ORU: ["R01"],
  SIU: ["S12", "S13", "S14", "S15", "S26"],
  MDM: ["T01", "T02", "T11"],
  DFT: ["P03"],
  BAR: ["P01", "P05"],
  RDE: ["O11"],
  VXU: ["V04"],
  ACK: [""],
};

// Required segments for each message type
const REQUIRED_SEGMENTS: Record<string, string[]> = {
  "ADT^A01": ["MSH", "EVN", "PID", "PV1"],
  "ADT^A02": ["MSH", "EVN", "PID", "PV1"],
  "ADT^A03": ["MSH", "EVN", "PID", "PV1"],
  "ADT^A04": ["MSH", "EVN", "PID", "PV1"],
  "ADT^A08": ["MSH", "EVN", "PID", "PV1"],
  "ORM^O01": ["MSH", "PID", "OBR"],
  "ORU^R01": ["MSH", "PID", "OBR", "OBX"],
};

// HL7 date format: YYYYMMDD or YYYYMMDDHHmmss
const HL7_DATE_REGEX = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(\d{2}([0-5]\d)([0-5]\d)?(\.\d{1,4})?([+-]\d{4})?)?$/;

function validateMSH(msg: HL7Message): ValidationResult[] {
  const results: ValidationResult[] = [];
  const msh = msg.getSegment("MSH");

  if (!msh) {
    results.push({
      severity: "error",
      segment: "MSH",
      message: "MSH segment is required but missing",
      code: "MSH_MISSING",
    });
    return results;
  }

  // MSH.1 - Field Separator
  if (!msh.getValue(1)) {
    results.push({
      severity: "error",
      segment: "MSH",
      field: 1,
      message: "MSH.1 (Field Separator) is required",
      code: "MSH1_MISSING",
    });
  }

  // MSH.2 - Encoding Characters
  const encoding = msh.getValue(2);
  if (!encoding || encoding.length < 4) {
    results.push({
      severity: "error",
      segment: "MSH",
      field: 2,
      message: "MSH.2 (Encoding Characters) must contain at least 4 characters (^~\\&)",
      code: "MSH2_INVALID",
    });
  }

  // MSH.3 - Sending Application
  if (!msh.getValue(3)) {
    results.push({
      severity: "warning",
      segment: "MSH",
      field: 3,
      message: "MSH.3 (Sending Application) is recommended",
      code: "MSH3_MISSING",
    });
  }

  // MSH.4 - Sending Facility
  if (!msh.getValue(4)) {
    results.push({
      severity: "warning",
      segment: "MSH",
      field: 4,
      message: "MSH.4 (Sending Facility) is recommended",
      code: "MSH4_MISSING",
    });
  }

  // MSH.7 - Date/Time of Message
  const dateTime = msh.getValue(7);
  if (!dateTime) {
    results.push({
      severity: "error",
      segment: "MSH",
      field: 7,
      message: "MSH.7 (Date/Time of Message) is required",
      code: "MSH7_MISSING",
    });
  } else if (!HL7_DATE_REGEX.test(dateTime)) {
    results.push({
      severity: "warning",
      segment: "MSH",
      field: 7,
      message: `MSH.7 date format may be invalid: "${dateTime}". Expected YYYYMMDD[HHmmss]`,
      code: "MSH7_FORMAT",
    });
  }

  // MSH.9 - Message Type
  const msgType = msh.getValue(9);
  if (!msgType) {
    results.push({
      severity: "error",
      segment: "MSH",
      field: 9,
      message: "MSH.9 (Message Type) is required",
      code: "MSH9_MISSING",
    });
  } else {
    const parts = msgType.split("^");
    const messageCode = parts[0];
    const triggerEvent = parts[1] ?? "";

    if (!VALID_MESSAGE_TYPES[messageCode]) {
      results.push({
        severity: "error",
        segment: "MSH",
        field: 9,
        message: `Unknown message type: "${messageCode}". Expected one of: ${Object.keys(VALID_MESSAGE_TYPES).join(", ")}`,
        code: "MSH9_UNKNOWN_TYPE",
      });
    } else if (triggerEvent && !VALID_MESSAGE_TYPES[messageCode].includes(triggerEvent)) {
      results.push({
        severity: "warning",
        segment: "MSH",
        field: 9,
        message: `Uncommon trigger event "${triggerEvent}" for message type "${messageCode}"`,
        code: "MSH9_UNCOMMON_EVENT",
      });
    }
  }

  // MSH.10 - Message Control ID
  if (!msh.getValue(10)) {
    results.push({
      severity: "error",
      segment: "MSH",
      field: 10,
      message: "MSH.10 (Message Control ID) is required",
      code: "MSH10_MISSING",
    });
  }

  // MSH.11 - Processing ID
  const procId = msh.getValue(11);
  if (!procId) {
    results.push({
      severity: "warning",
      segment: "MSH",
      field: 11,
      message: "MSH.11 (Processing ID) is recommended",
      code: "MSH11_MISSING",
    });
  } else if (!["P", "D", "T"].includes(procId)) {
    results.push({
      severity: "warning",
      segment: "MSH",
      field: 11,
      message: `MSH.11 Processing ID "${procId}" is non-standard. Expected P (Production), D (Debugging), or T (Training)`,
      code: "MSH11_NONSTANDARD",
    });
  }

  // MSH.12 - Version ID
  if (!msh.getValue(12)) {
    results.push({
      severity: "warning",
      segment: "MSH",
      field: 12,
      message: "MSH.12 (Version ID) is recommended",
      code: "MSH12_MISSING",
    });
  }

  return results;
}

function validateRequiredSegments(msg: HL7Message): ValidationResult[] {
  const results: ValidationResult[] = [];
  const msgType = msg.messageType;

  if (!msgType) return results;

  const typeKey = msgType.includes("^") ? msgType : msgType;
  const required = REQUIRED_SEGMENTS[typeKey];

  if (!required) {
    results.push({
      severity: "info",
      message: `No segment requirements defined for message type "${typeKey}"`,
      code: "NO_SEGMENT_RULES",
    });
    return results;
  }

  for (const segName of required) {
    if (!msg.getSegment(segName)) {
      results.push({
        severity: "error",
        segment: segName,
        message: `Required segment "${segName}" is missing for message type "${typeKey}"`,
        code: "SEGMENT_MISSING",
      });
    }
  }

  return results;
}

function validatePID(msg: HL7Message): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pid = msg.getSegment("PID");
  if (!pid) return results;

  // PID.3 - Patient Identifier
  if (!pid.getValue(3)) {
    results.push({
      severity: "warning",
      segment: "PID",
      field: 3,
      message: "PID.3 (Patient Identifier List) is recommended",
      code: "PID3_MISSING",
    });
  }

  // PID.5 - Patient Name
  if (!pid.getValue(5)) {
    results.push({
      severity: "error",
      segment: "PID",
      field: 5,
      message: "PID.5 (Patient Name) is required",
      code: "PID5_MISSING",
    });
  }

  // PID.7 - Date of Birth
  const dob = pid.getValue(7);
  if (dob && !HL7_DATE_REGEX.test(dob)) {
    results.push({
      severity: "warning",
      segment: "PID",
      field: 7,
      message: `PID.7 date of birth format may be invalid: "${dob}"`,
      code: "PID7_FORMAT",
    });
  }

  // PID.8 - Administrative Sex
  const sex = pid.getValue(8);
  if (sex && !["M", "F", "O", "U", "A", "N"].includes(sex)) {
    results.push({
      severity: "warning",
      segment: "PID",
      field: 8,
      message: `PID.8 Administrative Sex "${sex}" is non-standard. Expected M, F, O, U, A, or N`,
      code: "PID8_NONSTANDARD",
    });
  }

  return results;
}

function validateOBX(msg: HL7Message): ValidationResult[] {
  const results: ValidationResult[] = [];
  const obxSegments = msg.getSegments("OBX");

  for (let i = 0; i < obxSegments.length; i++) {
    const obx = obxSegments[i];
    const idx = i + 1;

    // OBX.2 - Value Type
    const valueType = obx.getValue(2);
    const validTypes = ["NM", "ST", "TX", "CE", "CWE", "SN", "DT", "TM", "TS", "FT", "ED", "RP", "XCN"];
    if (valueType && !validTypes.includes(valueType)) {
      results.push({
        severity: "warning",
        segment: "OBX",
        field: 2,
        message: `OBX[${idx}].2 Value Type "${valueType}" is non-standard`,
        code: "OBX2_NONSTANDARD",
      });
    }

    // OBX.3 - Observation Identifier
    if (!obx.getValue(3)) {
      results.push({
        severity: "error",
        segment: "OBX",
        field: 3,
        message: `OBX[${idx}].3 (Observation Identifier) is required`,
        code: "OBX3_MISSING",
      });
    }

    // OBX.11 - Observation Result Status
    const status = obx.getValue(11);
    if (status && !["C", "D", "F", "I", "N", "O", "P", "R", "S", "U", "W", "X"].includes(status)) {
      results.push({
        severity: "warning",
        segment: "OBX",
        field: 11,
        message: `OBX[${idx}].11 Result Status "${status}" is non-standard`,
        code: "OBX11_NONSTANDARD",
      });
    }
  }

  return results;
}

/**
 * Validate a parsed HL7 message and return a validation report.
 */
export function validateHL7Message(msg: HL7Message): ValidationReport {
  const all: ValidationResult[] = [
    ...validateMSH(msg),
    ...validateRequiredSegments(msg),
    ...validatePID(msg),
    ...validateOBX(msg),
  ];

  const errors = all.filter((r) => r.severity === "error");
  const warnings = all.filter((r) => r.severity === "warning");
  const infos = all.filter((r) => r.severity === "info");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    all,
  };
}

/**
 * Validate a raw HL7 string. Parses and validates in one step.
 */
export function validateHL7(raw: string): ValidationReport {
  try {
    const msg = parseHL7(raw);
    return validateHL7Message(msg);
  } catch (err) {
    return {
      valid: false,
      errors: [
        {
          severity: "error",
          message: `Failed to parse HL7 message: ${err instanceof Error ? err.message : String(err)}`,
          code: "PARSE_ERROR",
        },
      ],
      warnings: [],
      infos: [],
      all: [
        {
          severity: "error",
          message: `Failed to parse HL7 message: ${err instanceof Error ? err.message : String(err)}`,
          code: "PARSE_ERROR",
        },
      ],
    };
  }
}
