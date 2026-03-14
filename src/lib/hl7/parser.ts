/**
 * HL7 v2.x Parser - Custom implementation
 * Parses raw HL7 pipe-delimited messages into structured objects.
 */

// ---- Types ----

export interface HL7SubComponent {
  value: string;
}

export interface HL7Component {
  value: string;
  subComponents: HL7SubComponent[];
}

export interface HL7Field {
  raw: string;
  components: HL7Component[];
  repetitions: HL7FieldRepetition[];
}

export interface HL7FieldRepetition {
  raw: string;
  components: HL7Component[];
}

export interface HL7Segment {
  name: string;
  fields: HL7Field[];
  /** Get a field by 1-based index (e.g., segment.get(5) for PID.5) */
  get(fieldIndex: number): HL7Field | undefined;
  /** Get the raw string value of a field by 1-based index */
  getValue(fieldIndex: number): string;
  /** Get a specific component within a field (1-based indices) */
  getComponent(fieldIndex: number, componentIndex: number): string;
}

export interface HL7Delimiters {
  field: string;       // |
  component: string;   // ^
  repetition: string;  // ~
  escape: string;      // \
  subComponent: string; // &
}

export interface HL7Message {
  raw: string;
  delimiters: HL7Delimiters;
  segments: HL7Segment[];
  /** Get the first segment by name */
  getSegment(name: string): HL7Segment | undefined;
  /** Get all segments by name */
  getSegments(name: string): HL7Segment[];
  /** Get the message type (MSH.9), e.g. "ADT^A01" */
  messageType: string;
  /** Get the message control ID (MSH.10) */
  messageControlId: string;
  /** Get the processing ID (MSH.11) */
  processingId: string;
  /** Get the HL7 version (MSH.12) */
  version: string;
}

// ---- Default Delimiters ----

const DEFAULT_DELIMITERS: HL7Delimiters = {
  field: "|",
  component: "^",
  repetition: "~",
  escape: "\\",
  subComponent: "&",
};

// ---- Parsing Functions ----

function parseSubComponents(raw: string, delimiters: HL7Delimiters): HL7SubComponent[] {
  return raw.split(delimiters.subComponent).map((val) => ({ value: val }));
}

function parseComponents(raw: string, delimiters: HL7Delimiters): HL7Component[] {
  return raw.split(delimiters.component).map((val) => ({
    value: val,
    subComponents: parseSubComponents(val, delimiters),
  }));
}

function parseFieldRepetitions(raw: string, delimiters: HL7Delimiters): HL7FieldRepetition[] {
  return raw.split(delimiters.repetition).map((val) => ({
    raw: val,
    components: parseComponents(val, delimiters),
  }));
}

function parseField(raw: string, delimiters: HL7Delimiters): HL7Field {
  const repetitions = parseFieldRepetitions(raw, delimiters);
  return {
    raw,
    components: repetitions[0]?.components ?? [],
    repetitions,
  };
}

function createSegment(name: string, fields: HL7Field[]): HL7Segment {
  return {
    name,
    fields,
    get(fieldIndex: number): HL7Field | undefined {
      return this.fields[fieldIndex] ?? undefined;
    },
    getValue(fieldIndex: number): string {
      return this.fields[fieldIndex]?.raw ?? "";
    },
    getComponent(fieldIndex: number, componentIndex: number): string {
      const field = this.fields[fieldIndex];
      if (!field) return "";
      const comp = field.components[componentIndex - 1];
      return comp?.value ?? "";
    },
  };
}

function parseSegmentLine(line: string, delimiters: HL7Delimiters): HL7Segment {
  const name = line.substring(0, 3);

  if (name === "MSH") {
    // MSH is special: MSH.1 is the field separator itself, MSH.2 is the encoding characters.
    // The raw line looks like: MSH|^~\&|...
    // fields[0] = "MSH" segment name (index 0 = MSH.0 conceptually)
    // fields[1] = "|" (field separator, MSH.1)
    // fields[2] = "^~\&" (encoding chars, MSH.2)
    // fields[3..] = remaining fields (MSH.3+)
    const restAfterMSH = line.substring(3); // starts with |
    const fieldSep = restAfterMSH[0]; // should be |
    const remainingAfterSep = restAfterMSH.substring(1); // starts with ^~\&|...
    // Find the encoding characters (everything up to the next field separator)
    const nextPipe = remainingAfterSep.indexOf(fieldSep);
    const encodingChars = nextPipe >= 0 ? remainingAfterSep.substring(0, nextPipe) : remainingAfterSep;
    const restFields = nextPipe >= 0 ? remainingAfterSep.substring(nextPipe + 1).split(fieldSep) : [];

    const fields: HL7Field[] = [
      parseField(name, delimiters),       // index 0: segment name
      parseField(fieldSep, delimiters),   // index 1: MSH.1 field separator
      parseField(encodingChars, delimiters), // index 2: MSH.2 encoding chars
      ...restFields.map((f) => parseField(f, delimiters)), // index 3+: MSH.3+
    ];
    return createSegment(name, fields);
  }

  // Normal segment: split by field delimiter
  const parts = line.split(delimiters.field);
  const segName = parts[0];
  const fields: HL7Field[] = parts.map((p) => parseField(p, delimiters));
  return createSegment(segName, fields);
}

function extractDelimiters(raw: string): HL7Delimiters {
  // MSH line must start with "MSH" followed by the field separator
  // Then encoding characters: component, repetition, escape, subcomponent
  if (!raw.startsWith("MSH")) {
    return { ...DEFAULT_DELIMITERS };
  }
  const fieldSep = raw[3];
  const encoding = raw.substring(4, 8);
  return {
    field: fieldSep,
    component: encoding[0] ?? "^",
    repetition: encoding[1] ?? "~",
    escape: encoding[2] ?? "\\",
    subComponent: encoding[3] ?? "&",
  };
}

/**
 * Parse a raw HL7 v2.x message string into a structured HL7Message object.
 */
export function parseHL7(raw: string): HL7Message {
  // Normalize line endings
  const normalized = raw.replace(/\r\n/g, "\r").replace(/\n/g, "\r");
  const lines = normalized.split("\r").filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("Empty HL7 message");
  }

  const delimiters = extractDelimiters(lines[0]);
  const segments = lines.map((line) => parseSegmentLine(line, delimiters));

  const msh = segments.find((s) => s.name === "MSH");

  return {
    raw,
    delimiters,
    segments,
    getSegment(name: string): HL7Segment | undefined {
      return this.segments.find((s) => s.name === name);
    },
    getSegments(name: string): HL7Segment[] {
      return this.segments.filter((s) => s.name === name);
    },
    get messageType(): string {
      return msh?.getValue(9) ?? "";
    },
    get messageControlId(): string {
      return msh?.getValue(10) ?? "";
    },
    get processingId(): string {
      return msh?.getValue(11) ?? "";
    },
    get version(): string {
      return msh?.getValue(12) ?? "";
    },
  };
}

/**
 * Named field map for common HL7 segments with human-readable names.
 */
export const HL7_FIELD_NAMES: Record<string, Record<number, string>> = {
  MSH: {
    1: "Field Separator",
    2: "Encoding Characters",
    3: "Sending Application",
    4: "Sending Facility",
    5: "Receiving Application",
    6: "Receiving Facility",
    7: "Date/Time of Message",
    8: "Security",
    9: "Message Type",
    10: "Message Control ID",
    11: "Processing ID",
    12: "Version ID",
  },
  PID: {
    1: "Set ID",
    2: "Patient ID (External)",
    3: "Patient Identifier List",
    4: "Alternate Patient ID",
    5: "Patient Name",
    6: "Mother's Maiden Name",
    7: "Date/Time of Birth",
    8: "Administrative Sex",
    9: "Patient Alias",
    10: "Race",
    11: "Patient Address",
    12: "County Code",
    13: "Phone Number - Home",
    14: "Phone Number - Business",
    15: "Primary Language",
    16: "Marital Status",
    17: "Religion",
    18: "Patient Account Number",
    19: "SSN Number",
  },
  PV1: {
    1: "Set ID",
    2: "Patient Class",
    3: "Assigned Patient Location",
    4: "Admission Type",
    5: "Preadmit Number",
    6: "Prior Patient Location",
    7: "Attending Doctor",
    8: "Referring Doctor",
    9: "Consulting Doctor",
    10: "Hospital Service",
    14: "Admit Source",
    17: "Admitting Doctor",
    18: "Patient Type",
    19: "Visit Number",
    36: "Discharge Disposition",
    44: "Admit Date/Time",
    45: "Discharge Date/Time",
  },
  OBR: {
    1: "Set ID",
    2: "Placer Order Number",
    3: "Filler Order Number",
    4: "Universal Service Identifier",
    7: "Observation Date/Time",
    13: "Relevant Clinical Info",
    16: "Ordering Provider",
    24: "Diagnostic Service Sect ID",
    25: "Result Status",
  },
  OBX: {
    1: "Set ID",
    2: "Value Type",
    3: "Observation Identifier",
    4: "Observation Sub-ID",
    5: "Observation Value",
    6: "Units",
    7: "Reference Range",
    8: "Abnormal Flags",
    11: "Observation Result Status",
    14: "Date/Time of Observation",
  },
  NK1: {
    1: "Set ID",
    2: "Name",
    3: "Relationship",
    4: "Address",
    5: "Phone Number",
  },
  EVN: {
    1: "Event Type Code",
    2: "Recorded Date/Time",
    3: "Date/Time Planned Event",
    4: "Event Reason Code",
    5: "Operator ID",
    6: "Event Occurred",
  },
};

/**
 * Convert a parsed HL7 message to a plain JSON-serializable object.
 */
export function hl7ToJSON(message: HL7Message) {
  return {
    messageType: message.messageType,
    messageControlId: message.messageControlId,
    processingId: message.processingId,
    version: message.version,
    segments: message.segments.map((seg) => ({
      name: seg.name,
      fields: seg.fields.map((field, idx) => ({
        index: idx,
        name: HL7_FIELD_NAMES[seg.name]?.[idx] ?? `Field ${idx}`,
        value: field.raw,
        components: field.components.map((c) => c.value),
        repetitions: field.repetitions.map((r) => ({
          value: r.raw,
          components: r.components.map((c) => c.value),
        })),
      })),
    })),
  };
}
