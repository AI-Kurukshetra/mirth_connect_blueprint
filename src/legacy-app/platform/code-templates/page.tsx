"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-[var(--hb-surface)] rounded-lg border border-[var(--hb-border)]">
      <div className="flex items-center gap-3 text-[var(--hb-text-secondary)]">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading editor...
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CodeTemplateLibrary {
  id: string;
  name: string;
  description: string | null;
  linked_channel_ids: string[];
}

interface CodeTemplate {
  id: string;
  library_id: string;
  name: string;
  description: string | null;
  template_type: "function" | "code_block" | "compiled_code";
  code: string;
  is_active: boolean;
}

interface Channel {
  id: string;
  name: string;
}

type TemplateType = CodeTemplate["template_type"];

// ---------------------------------------------------------------------------
// Built-in starter templates
// ---------------------------------------------------------------------------

const STARTER_TEMPLATES: Omit<CodeTemplate, "id" | "library_id">[] = [
  {
    name: "HL7 Field Getter",
    description:
      "Extract a specific field value from an HL7 v2 message by segment name, field index, and optional component/sub-component indices.",
    template_type: "function",
    code: `/**
 * getHL7Field - Extracts a field value from a raw HL7 v2 message.
 *
 * @param {string} message    - The raw HL7 message (pipe-delimited).
 * @param {string} segmentId  - Segment identifier, e.g. "PID", "OBX".
 * @param {number} fieldIndex - 1-based field index within the segment.
 * @param {number} [component]    - Optional 1-based component index.
 * @param {number} [subComponent] - Optional 1-based sub-component index.
 * @returns {string} The extracted value or an empty string if not found.
 */
function getHL7Field(message, segmentId, fieldIndex, component, subComponent) {
  var segments = message.replace(/\\r\\n/g, '\\r').replace(/\\n/g, '\\r').split('\\r');

  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    if (seg.substring(0, 3) === segmentId) {
      var fields = seg.split('|');
      // MSH counts differently: MSH-1 is the separator itself
      var idx = segmentId === 'MSH' ? fieldIndex : fieldIndex;
      var value = fields[idx] || '';

      if (component !== undefined) {
        var components = value.split('^');
        value = components[component - 1] || '';
      }
      if (subComponent !== undefined) {
        var subs = value.split('&');
        value = subs[subComponent - 1] || '';
      }
      return value;
    }
  }
  return '';
}`,
    is_active: true,
  },
  {
    name: "Date Formatter",
    description:
      "Utilities for converting between HL7 datetime formats (yyyyMMddHHmmss) and ISO-8601 / human-readable strings used in healthcare systems.",
    template_type: "function",
    code: `/**
 * Healthcare Date Format Utilities
 *
 * HL7 dates use the format: yyyyMMddHHmmss[.SSSS][+/-ZZZZ]
 * FHIR / ISO-8601 uses:     yyyy-MM-ddTHH:mm:ss.SSSZ
 */

/**
 * hl7ToISO - Convert an HL7 datetime string to ISO-8601.
 * @param {string} hl7Date - e.g. "20250115143022"
 * @returns {string} ISO string e.g. "2025-01-15T14:30:22.000Z"
 */
function hl7ToISO(hl7Date) {
  if (!hl7Date || hl7Date.length < 8) return '';
  var y  = hl7Date.substring(0, 4);
  var mo = hl7Date.substring(4, 6);
  var d  = hl7Date.substring(6, 8);
  var h  = hl7Date.substring(8, 10)  || '00';
  var mi = hl7Date.substring(10, 12) || '00';
  var s  = hl7Date.substring(12, 14) || '00';
  return y + '-' + mo + '-' + d + 'T' + h + ':' + mi + ':' + s + '.000Z';
}

/**
 * isoToHL7 - Convert an ISO-8601 date string to HL7 format.
 * @param {string} isoDate
 * @returns {string} HL7 datetime e.g. "20250115143022"
 */
function isoToHL7(isoDate) {
  var dt = new Date(isoDate);
  if (isNaN(dt.getTime())) return '';
  var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
  return '' + dt.getUTCFullYear() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    pad(dt.getUTCSeconds());
}

/**
 * formatPatientDOB - Formats an HL7 date as a readable date of birth.
 * @param {string} hl7Date - e.g. "19850322"
 * @returns {string} "March 22, 1985"
 */
function formatPatientDOB(hl7Date) {
  var months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  if (!hl7Date || hl7Date.length < 8) return '';
  var m = parseInt(hl7Date.substring(4, 6), 10);
  var d = parseInt(hl7Date.substring(6, 8), 10);
  var y = hl7Date.substring(0, 4);
  return months[m - 1] + ' ' + d + ', ' + y;
}`,
    is_active: true,
  },
  {
    name: "FHIR Resource Builder",
    description:
      "Helper functions to construct valid FHIR R4 Patient and Observation resources from HL7 message data.",
    template_type: "function",
    code: `/**
 * FHIR R4 Resource Builder Utilities
 */

/**
 * buildPatientResource - Creates a FHIR Patient resource.
 * @param {Object} params
 * @param {string} params.mrn         - Medical Record Number
 * @param {string} params.familyName  - Last name
 * @param {string} params.givenName   - First name
 * @param {string} params.birthDate   - ISO date (yyyy-MM-dd)
 * @param {string} params.gender      - male | female | other | unknown
 * @returns {Object} FHIR Patient resource
 */
function buildPatientResource(params) {
  return {
    resourceType: 'Patient',
    identifier: [{
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }]
      },
      value: params.mrn
    }],
    name: [{
      use: 'official',
      family: params.familyName,
      given: [params.givenName]
    }],
    gender: params.gender || 'unknown',
    birthDate: params.birthDate
  };
}

/**
 * buildObservationResource - Creates a FHIR Observation resource.
 * @param {Object} params
 * @param {string} params.patientRef   - Reference like "Patient/123"
 * @param {string} params.loincCode    - LOINC code
 * @param {string} params.displayName  - Human-readable name
 * @param {number} params.value        - Numeric result
 * @param {string} params.unit         - UCUM unit
 * @param {string} params.dateTime     - ISO datetime
 * @returns {Object} FHIR Observation resource
 */
function buildObservationResource(params) {
  return {
    resourceType: 'Observation',
    status: 'final',
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: params.loincCode,
        display: params.displayName
      }]
    },
    subject: { reference: params.patientRef },
    effectiveDateTime: params.dateTime,
    valueQuantity: {
      value: params.value,
      unit: params.unit,
      system: 'http://unitsofmeasure.org',
      code: params.unit
    }
  };
}`,
    is_active: true,
  },
  {
    name: "Error Logger",
    description:
      "Standardized error-logging utility that captures structured error context including channel, connector, severity, and stack traces.",
    template_type: "code_block",
    code: `/**
 * Standard Error Logger
 *
 * Provides consistent error logging across all channels with
 * structured metadata for easier debugging and audit trails.
 */

var ErrorSeverity = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', FATAL: 'FATAL' };

/**
 * logError - Logs a structured error entry.
 * @param {Object} opts
 * @param {string} opts.channelName  - Name of the originating channel
 * @param {string} opts.connectorName - Connector that encountered the error
 * @param {string} opts.severity     - One of INFO, WARN, ERROR, FATAL
 * @param {string} opts.message      - Human-readable error message
 * @param {*}      [opts.data]       - Additional context data
 * @param {Error}  [opts.error]      - Original Error object
 */
function logError(opts) {
  var entry = {
    timestamp: new Date().toISOString(),
    channel: opts.channelName || 'UNKNOWN',
    connector: opts.connectorName || 'UNKNOWN',
    severity: opts.severity || ErrorSeverity.ERROR,
    message: opts.message || 'An error occurred',
    data: opts.data || null,
    stack: opts.error ? opts.error.stack : null
  };

  // Format for Mirth Connect logger
  var logLine = '[' + entry.severity + '] ' +
    entry.channel + '/' + entry.connector +
    ' - ' + entry.message;

  if (entry.severity === ErrorSeverity.FATAL || entry.severity === ErrorSeverity.ERROR) {
    logger.error(logLine);
  } else if (entry.severity === ErrorSeverity.WARN) {
    logger.warn(logLine);
  } else {
    logger.info(logLine);
  }

  // Return the structured entry for further processing (e.g. writing to DB)
  return entry;
}

/**
 * wrapHandler - Wraps a message handler with automatic error logging.
 */
function wrapHandler(channelName, connectorName, handler) {
  try {
    return handler();
  } catch (e) {
    logError({
      channelName: channelName,
      connectorName: connectorName,
      severity: ErrorSeverity.ERROR,
      message: e.message,
      error: e
    });
    throw e;
  }
}`,
    is_active: true,
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMPLATE_TYPE_META: Record<
  TemplateType,
  { label: string; color: string; bg: string }
> = {
  function: {
    label: "Function",
    color: "text-[var(--hb-teal)]",
    bg: "bg-[var(--hb-teal)]/15 border-[var(--hb-teal)]/30",
  },
  code_block: {
    label: "Code Block",
    color: "text-[var(--hb-teal)]",
    bg: "bg-[var(--hb-teal)]/15 border-[var(--hb-teal)]/30",
  },
  compiled_code: {
    label: "Compiled Code",
    color: "text-[var(--hb-amber)]",
    bg: "bg-[var(--hb-amber)]/15 border-[var(--hb-amber)]/30",
  },
};

// ---------------------------------------------------------------------------
// Confirmation Modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-[var(--hb-text-primary)] mb-2">{title}</h3>
        <p className="text-[var(--hb-text-secondary)] text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] hover:bg-[var(--hb-elevated)] border border-[var(--hb-border)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--hb-red)] text-[var(--hb-text-primary)] hover:bg-[var(--hb-red)] transition-colors cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Library Modal (Add / Edit)
// ---------------------------------------------------------------------------

function LibraryModal({
  library,
  onSave,
  onClose,
}: {
  library: CodeTemplateLibrary | null;
  onSave: (name: string, description: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(library?.name ?? "");
  const [desc, setDesc] = useState(library?.description ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl shadow-2xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--hb-text-primary)] mb-4">
          {library ? "Edit Library" : "New Code Template Library"}
        </h3>

        <label className="block text-sm text-[var(--hb-text-secondary)] mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Shared Utilities"
          className="w-full mb-4 px-3 py-2 bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg text-[var(--hb-text-primary)] text-sm placeholder:text-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)]"
        />

        <label className="block text-sm text-[var(--hb-text-secondary)] mb-1">Description</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="Describe what this library contains..."
          className="w-full mb-6 px-3 py-2 bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg text-[var(--hb-text-primary)] text-sm placeholder:text-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)] resize-none"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] hover:bg-[var(--hb-elevated)] border border-[var(--hb-border)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name.trim(), desc.trim())}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--hb-teal-dim)] text-[var(--hb-text-primary)] hover:bg-[var(--hb-teal)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {library ? "Save Changes" : "Create Library"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CodeTemplatesPage() {
  const supabase = createClient();

  // Data
  const [libraries, setLibraries] = useState<CodeTemplateLibrary[]>([]);
  const [templates, setTemplates] = useState<CodeTemplate[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({});

  // UI State
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CodeTemplate | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [libraryModal, setLibraryModal] = useState<{
    open: boolean;
    library: CodeTemplateLibrary | null;
  }>({ open: false, library: null });
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    type: "library" | "template";
    id: string;
    name: string;
  } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchLibraries = useCallback(async () => {
    const { data } = await supabase
      .from("code_template_libraries")
      .select("*")
      .order("name");
    setLibraries((data as CodeTemplateLibrary[]) ?? []);
  }, [supabase]);

  const fetchTemplateCounts = useCallback(async () => {
    const { data } = await supabase
      .from("code_templates")
      .select("library_id");
    if (data) {
      const counts: Record<string, number> = {};
      (data as { library_id: string }[]).forEach((t) => {
        counts[t.library_id] = (counts[t.library_id] || 0) + 1;
      });
      setTemplateCounts(counts);
    }
  }, [supabase]);

  const fetchTemplates = useCallback(
    async (libraryId: string) => {
      const { data } = await supabase
        .from("code_templates")
        .select("*")
        .eq("library_id", libraryId)
        .order("name");
      setTemplates((data as CodeTemplate[]) ?? []);
    },
    [supabase]
  );

  const fetchChannels = useCallback(async () => {
    const { data } = await supabase
      .from("channels")
      .select("id, name")
      .order("name");
    setChannels((data as Channel[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLibraries(), fetchTemplateCounts(), fetchChannels()]);
      setLoading(false);
    };
    init();
  }, [fetchLibraries, fetchTemplateCounts, fetchChannels]);

  useEffect(() => {
    if (selectedLibraryId) {
      fetchTemplates(selectedLibraryId);
      setEditingTemplate(null);
      setIsNewTemplate(false);
    }
  }, [selectedLibraryId, fetchTemplates]);

  // -------------------------------------------------------------------------
  // Library CRUD
  // -------------------------------------------------------------------------

  const handleSaveLibrary = async (name: string, description: string) => {
    if (!name) return;
    const existing = libraryModal.library;

    if (existing) {
      await supabase
        .from("code_template_libraries")
        .update({ name, description: description || null })
        .eq("id", existing.id);
    } else {
      await supabase.from("code_template_libraries").insert({
        name,
        description: description || null,
        linked_channel_ids: [],
      });
    }

    setLibraryModal({ open: false, library: null });
    await fetchLibraries();
  };

  const handleDeleteLibrary = async (id: string) => {
    // Delete all templates in the library first
    await supabase.from("code_templates").delete().eq("library_id", id);
    await supabase.from("code_template_libraries").delete().eq("id", id);

    if (selectedLibraryId === id) {
      setSelectedLibraryId(null);
      setTemplates([]);
      setEditingTemplate(null);
    }
    setConfirmDelete(null);
    await Promise.all([fetchLibraries(), fetchTemplateCounts()]);
  };

  // -------------------------------------------------------------------------
  // Template CRUD
  // -------------------------------------------------------------------------

  const handleNewTemplate = () => {
    if (!selectedLibraryId) return;
    setIsNewTemplate(true);
    setEditingTemplate({
      id: "",
      library_id: selectedLibraryId,
      name: "",
      description: "",
      template_type: "function",
      code: "// Write your code here\n",
      is_active: true,
    });
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.name.trim()) return;
    setSaving(true);

    const payload = {
      library_id: editingTemplate.library_id,
      name: editingTemplate.name.trim(),
      description: editingTemplate.description || null,
      template_type: editingTemplate.template_type,
      code: editingTemplate.code,
      is_active: editingTemplate.is_active,
    };

    if (isNewTemplate) {
      const { data } = await supabase
        .from("code_templates")
        .insert(payload)
        .select()
        .single();
      if (data) {
        setEditingTemplate(data as CodeTemplate);
        setIsNewTemplate(false);
      }
    } else {
      await supabase
        .from("code_templates")
        .update(payload)
        .eq("id", editingTemplate.id);
    }

    setSaving(false);
    await fetchTemplates(editingTemplate.library_id);
    await fetchTemplateCounts();
  };

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from("code_templates").delete().eq("id", id);
    setConfirmDelete(null);

    if (editingTemplate?.id === id) {
      setEditingTemplate(null);
      setIsNewTemplate(false);
    }

    if (selectedLibraryId) {
      await fetchTemplates(selectedLibraryId);
      await fetchTemplateCounts();
    }
  };

  const handleInsertStarter = async (
    starter: (typeof STARTER_TEMPLATES)[number]
  ) => {
    if (!selectedLibraryId) return;
    await supabase.from("code_templates").insert({
      library_id: selectedLibraryId,
      ...starter,
    });
    await fetchTemplates(selectedLibraryId);
    await fetchTemplateCounts();
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const selectedLibrary = libraries.find((l) => l.id === selectedLibraryId) ?? null;

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q) ||
      t.template_type.toLowerCase().includes(q)
    );
  });

  const linkedChannelNames = selectedLibrary
    ? channels.filter((c) => selectedLibrary.linked_channel_ids?.includes(c.id))
    : [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex items-center gap-3 text-[var(--hb-text-secondary)]">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading code templates...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 hb-animate-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--hb-border)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hb-text-primary)] tracking-tight">
            Code Templates
          </h1>
          <p className="text-sm text-[var(--hb-text-secondary)] mt-0.5">
            Manage reusable JavaScript libraries and templates across HealthBridge channels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--hb-text-tertiary)] bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {libraries.length} {libraries.length === 1 ? "library" : "libraries"}
          </div>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ---- LEFT: Library Sidebar ---- */}
        <aside className="w-[270px] flex-shrink-0 border-r border-[var(--hb-border)] bg-[var(--hb-obsidian)] flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--hb-border)]">
            <span className="text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)]">
              Libraries
            </span>
            <button
              onClick={() => setLibraryModal({ open: true, library: null })}
              className="p-1 rounded-md text-[var(--hb-text-secondary)] hover:text-[var(--hb-teal)] hover:bg-[var(--hb-deep)] transition-colors cursor-pointer"
              title="Add library"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>

          {/* Library list */}
          <div className="flex-1 overflow-y-auto py-2">
            {libraries.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--hb-deep)] border border-[var(--hb-border)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--hb-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--hb-text-tertiary)]">No libraries yet</p>
                <button
                  onClick={() => setLibraryModal({ open: true, library: null })}
                  className="mt-2 text-xs text-[var(--hb-teal)] hover:text-[var(--hb-teal)] cursor-pointer"
                >
                  Create your first library
                </button>
              </div>
            ) : (
              libraries.map((lib) => {
                const isActive = lib.id === selectedLibraryId;
                const count = templateCounts[lib.id] ?? 0;
                return (
                  <div
                    key={lib.id}
                    onClick={() => setSelectedLibraryId(lib.id)}
                    className={`group mx-2 mb-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? "bg-[var(--hb-teal-dim)]/15 border border-[var(--hb-teal)]/30"
                        : "hover:bg-[var(--hb-surface)] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-[var(--hb-teal)]" : "text-[var(--hb-text-secondary)]"
                        }`}
                      >
                        {lib.name}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLibraryModal({ open: true, library: lib });
                          }}
                          className="p-1 rounded text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-secondary)] hover:bg-[var(--hb-deep)] cursor-pointer"
                          title="Edit library"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({
                              open: true,
                              type: "library",
                              id: lib.id,
                              name: lib.name,
                            });
                          }}
                          className="p-1 rounded text-[var(--hb-text-tertiary)] hover:text-[var(--hb-red)] hover:bg-[var(--hb-deep)] cursor-pointer"
                          title="Delete library"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      {lib.description ? (
                        <p className="text-xs text-[var(--hb-text-tertiary)] truncate mr-2">
                          {lib.description}
                        </p>
                      ) : (
                        <span />
                      )}
                      <span className="text-[10px] text-[var(--hb-text-tertiary)] bg-[var(--hb-elevated)]/80 rounded px-1.5 py-0.5 flex-shrink-0">
                        {count} {count === 1 ? "template" : "templates"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ---- RIGHT: Main Content ---- */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--hb-obsidian)]">
          {!selectedLibraryId ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--hb-teal)]/20 to-[var(--hb-teal)]/20 border border-[var(--hb-teal)]/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--hb-teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[var(--hb-text-primary)] mb-2">
                  Code Template Libraries
                </h2>
                <p className="text-sm text-[var(--hb-text-secondary)] mb-6">
                  Select a library from the sidebar to view and manage its templates, or create a new library to get started.
                </p>
                <button
                  onClick={() => setLibraryModal({ open: true, library: null })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--hb-teal-dim)] text-[var(--hb-text-primary)] text-sm font-medium rounded-lg hover:bg-[var(--hb-teal)] transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Library
                </button>
              </div>
            </div>
          ) : editingTemplate ? (
            /* ---- Template Editor ---- */
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {/* Editor header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--hb-border)] bg-[var(--hb-surface)]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setIsNewTemplate(false);
                    }}
                    className="p-1.5 rounded-lg text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-deep)] transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </button>
                  <h2 className="text-base font-semibold text-[var(--hb-text-primary)]">
                    {isNewTemplate ? "New Template" : "Edit Template"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {!isNewTemplate && (
                    <button
                      onClick={() =>
                        setConfirmDelete({
                          open: true,
                          type: "template",
                          id: editingTemplate.id,
                          name: editingTemplate.name,
                        })
                      }
                      className="px-3 py-1.5 text-sm rounded-lg bg-[var(--hb-deep)] text-[var(--hb-red)] hover:bg-[var(--hb-red)]/15 border border-[var(--hb-border)] hover:border-[var(--hb-red)]/30 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={handleSaveTemplate}
                    disabled={saving || !editingTemplate.name.trim()}
                    className="px-4 py-1.5 text-sm rounded-lg bg-[var(--hb-teal-dim)] text-[var(--hb-text-primary)] hover:bg-[var(--hb-teal)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {saving && (
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    Save Template
                  </button>
                </div>
              </div>

              {/* Editor body */}
              <div className="p-6 space-y-5">
                {/* Row: Name + Type + Active */}
                <div className="grid grid-cols-[1fr_200px_auto] gap-4 items-end">
                  <div>
                    <label className="block text-sm text-[var(--hb-text-secondary)] mb-1.5">
                      Template Name
                    </label>
                    <input
                      value={editingTemplate.name}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, name: e.target.value })
                      }
                      placeholder="e.g. HL7 Field Getter"
                      className="w-full px-3 py-2 bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg text-[var(--hb-text-primary)] text-sm placeholder:text-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--hb-text-secondary)] mb-1.5">
                      Type
                    </label>
                    <select
                      value={editingTemplate.template_type}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          template_type: e.target.value as TemplateType,
                        })
                      }
                      className="w-full px-3 py-2 bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)] cursor-pointer appearance-none"
                    >
                      <option value="function">Function</option>
                      <option value="code_block">Code Block</option>
                      <option value="compiled_code">Compiled Code</option>
                    </select>
                  </div>
                  <div className="pb-0.5">
                    <button
                      onClick={() =>
                        setEditingTemplate({
                          ...editingTemplate,
                          is_active: !editingTemplate.is_active,
                        })
                      }
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                        editingTemplate.is_active ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border-bright)]"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          editingTemplate.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="ml-2 text-xs text-[var(--hb-text-secondary)]">
                      {editingTemplate.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-[var(--hb-text-secondary)] mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={editingTemplate.description ?? ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Describe what this template does..."
                    className="w-full px-3 py-2 bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg text-[var(--hb-text-primary)] text-sm placeholder:text-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)] resize-none"
                  />
                </div>

                {/* Code editor */}
                <div>
                  <label className="block text-sm text-[var(--hb-text-secondary)] mb-1.5">
                    Code
                  </label>
                  <div className="rounded-lg overflow-hidden border border-[var(--hb-border)]">
                    <MonacoEditor
                      height="400px"
                      language="javascript"
                      theme="vs-dark"
                      value={editingTemplate.code}
                      onChange={(val) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          code: val ?? "",
                        })
                      }
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: "on",
                        padding: { top: 12, bottom: 12 },
                      }}
                    />
                  </div>
                </div>

                {/* Linked Channels */}
                {selectedLibrary && (
                  <div>
                    <label className="block text-sm text-[var(--hb-text-secondary)] mb-1.5">
                      Linked Channels
                    </label>
                    <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-lg p-4">
                      {linkedChannelNames.length === 0 ? (
                        <p className="text-sm text-[var(--hb-text-tertiary)]">
                          No channels are linked to the &quot;{selectedLibrary.name}&quot; library.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {linkedChannelNames.map((ch) => (
                            <span
                              key={ch.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-md text-xs text-[var(--hb-text-secondary)]"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--hb-green)]" />
                              {ch.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ---- Template List ---- */
            <div className="flex-1 flex flex-col min-h-0">
              {/* List header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--hb-border)] bg-[var(--hb-surface)]">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-[var(--hb-text-primary)]">
                    {selectedLibrary?.name}
                  </h2>
                  {selectedLibrary?.description && (
                    <span className="text-xs text-[var(--hb-text-tertiary)] hidden lg:inline">
                      {selectedLibrary.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--hb-text-tertiary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search templates..."
                      className="w-48 pl-8 pr-3 py-1.5 bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg text-[var(--hb-text-primary)] text-xs placeholder:text-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)]"
                    />
                  </div>
                  <button
                    onClick={handleNewTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--hb-teal-dim)] text-[var(--hb-text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--hb-teal)] transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Template
                  </button>
                </div>
              </div>

              {/* Template cards */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredTemplates.length === 0 && !searchQuery ? (
                  /* Empty library state */
                  <div className="text-center py-12">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--hb-surface)] border border-[var(--hb-border)] flex items-center justify-center">
                      <svg className="w-7 h-7 text-[var(--hb-text-ghost)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-[var(--hb-text-secondary)] mb-1">
                      No templates yet
                    </h3>
                    <p className="text-xs text-[var(--hb-text-tertiary)] mb-5 max-w-sm mx-auto">
                      Add a new template or start with one of the built-in starters below.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {STARTER_TEMPLATES.map((st) => {
                        const meta = TEMPLATE_TYPE_META[st.template_type];
                        return (
                          <button
                            key={st.name}
                            onClick={() => handleInsertStarter(st)}
                            className="text-left p-3.5 bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-lg hover:border-[var(--hb-teal)]/40 hover:bg-[var(--hb-teal)]/5 transition-all group cursor-pointer"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-[var(--hb-text-primary)] group-hover:text-[var(--hb-teal)] transition-colors">
                                {st.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}
                              >
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--hb-text-tertiary)] line-clamp-2">
                              {st.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : filteredTemplates.length === 0 && searchQuery ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-[var(--hb-text-tertiary)]">
                      No templates matching &quot;{searchQuery}&quot;
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredTemplates.map((tmpl) => {
                      const meta = TEMPLATE_TYPE_META[tmpl.template_type];
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => {
                            setEditingTemplate(tmpl);
                            setIsNewTemplate(false);
                          }}
                          className="group p-4 bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl hover:border-[var(--hb-border)] hover:bg-[var(--hb-surface)]/80 transition-all cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-sm font-semibold text-[var(--hb-text-primary)] group-hover:text-[var(--hb-teal)] transition-colors truncate mr-2">
                              {tmpl.name}
                            </h3>
                            <span
                              className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}
                            >
                              {meta.label}
                            </span>
                          </div>
                          {tmpl.description && (
                            <p className="text-xs text-[var(--hb-text-tertiary)] line-clamp-2 mb-3">
                              {tmpl.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  tmpl.is_active ? "bg-[var(--hb-green)]" : "bg-[var(--hb-border-bright)]"
                                }`}
                              />
                              <span
                                className={`text-[11px] ${
                                  tmpl.is_active ? "text-[var(--hb-green)]" : "text-[var(--hb-text-tertiary)]"
                                }`}
                              >
                                {tmpl.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <svg
                              className="w-4 h-4 text-[var(--hb-text-ghost)] group-hover:text-[var(--hb-text-secondary)] transition-colors"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                              />
                            </svg>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add starter templates section when library has some templates */}
                    <div className="lg:col-span-2 xl:col-span-3 mt-4 pt-4 border-t border-[var(--hb-border)]">
                      <p className="text-xs text-[var(--hb-text-tertiary)] mb-3">
                        Quick add starter templates:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {STARTER_TEMPLATES.map((st) => {
                          const alreadyExists = templates.some(
                            (t) => t.name === st.name
                          );
                          return (
                            <button
                              key={st.name}
                              onClick={() => handleInsertStarter(st)}
                              disabled={alreadyExists}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                                alreadyExists
                                  ? "bg-[var(--hb-surface)] border-[var(--hb-border)] text-[var(--hb-text-ghost)] cursor-not-allowed"
                                  : "bg-[var(--hb-surface)] border-[var(--hb-border)] text-[var(--hb-text-secondary)] hover:text-[var(--hb-teal)] hover:border-[var(--hb-teal)]/40"
                              }`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              {st.name}
                              {alreadyExists && (
                                <span className="text-[10px] text-[var(--hb-text-ghost)]">(added)</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ---- Modals ---- */}
      {libraryModal.open && (
        <LibraryModal
          library={libraryModal.library}
          onSave={handleSaveLibrary}
          onClose={() => setLibraryModal({ open: false, library: null })}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete ${confirmDelete.type === "library" ? "Library" : "Template"}`}
          message={
            confirmDelete.type === "library"
              ? `Are you sure you want to delete "${confirmDelete.name}" and all its templates? This action cannot be undone.`
              : `Are you sure you want to delete the template "${confirmDelete.name}"? This action cannot be undone.`
          }
          onConfirm={() =>
            confirmDelete.type === "library"
              ? handleDeleteLibrary(confirmDelete.id)
              : handleDeleteTemplate(confirmDelete.id)
          }
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
