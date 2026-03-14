"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────
export interface TransformerStep {
  id: string;
  type: "mapper" | "message_builder" | "javascript" | "xslt" | "iterator" | "destination_set_filter";
  name: string;
  enabled: boolean;
  // Mapper/Message Builder
  sourceField?: string;
  targetField?: string;
  targetVariable?: string;
  variableMap?: string; // channelMap, connectorMap, etc.
  // JavaScript
  script?: string;
  // XSLT
  stylesheet?: string;
}

export interface FilterRule {
  id: string;
  type: "rule_builder" | "javascript";
  name: string;
  enabled: boolean;
  // Rule Builder
  field?: string;
  condition?: "equals" | "not_equals" | "contains" | "not_contains" | "exists" | "not_exists" | "regex" | "starts_with";
  value?: string;
  // JavaScript
  script?: string;
}

interface TransformerEditorProps {
  steps: TransformerStep[];
  onChange: (steps: TransformerStep[]) => void;
  mode: "transformer" | "filter";
  inboundDataType?: string;
  outboundDataType?: string;
  sampleMessage?: string;
}

const STEP_TYPES = [
  { value: "mapper", label: "Mapper", desc: "Map a field to a variable" },
  { value: "message_builder", label: "Message Builder", desc: "Set a field in the outbound message" },
  { value: "javascript", label: "JavaScript", desc: "Custom transformation script" },
  { value: "xslt", label: "XSLT", desc: "Apply XSLT stylesheet" },
  { value: "iterator", label: "Iterator", desc: "Loop over repeating segments" },
  { value: "destination_set_filter", label: "Dest Set Filter", desc: "Conditionally skip destinations" },
];

const FILTER_TYPES = [
  { value: "rule_builder", label: "Rule Builder", desc: "Visual rule builder" },
  { value: "javascript", label: "JavaScript", desc: "Custom filter script" },
];

const CONDITIONS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "exists", label: "Exists" },
  { value: "not_exists", label: "Does Not Exist" },
  { value: "regex", label: "Matches Regex" },
  { value: "starts_with", label: "Starts With" },
];

const VARIABLE_MAPS = [
  { value: "channelMap", label: "$c (channelMap)" },
  { value: "connectorMap", label: "$co (connectorMap)" },
  { value: "sourceMap", label: "$s (sourceMap)" },
  { value: "responseMap", label: "$r (responseMap)" },
  { value: "globalChannelMap", label: "$gc (globalChannelMap)" },
  { value: "globalMap", label: "$g (globalMap)" },
];

// HL7 message tree for the visual editor
const HL7_SEGMENTS = [
  { seg: "MSH", fields: ["Field Separator", "Encoding Characters", "Sending Application", "Sending Facility", "Receiving Application", "Receiving Facility", "Date/Time", "Security", "Message Type", "Message Control ID", "Processing ID", "Version ID"] },
  { seg: "PID", fields: ["Set ID", "Patient ID", "Patient Identifier List", "Alt Patient ID", "Patient Name", "Mother Maiden Name", "Date of Birth", "Sex", "Patient Alias", "Race", "Patient Address", "County Code", "Phone - Home", "Phone - Business", "Language", "Marital Status", "Religion", "Account Number"] },
  { seg: "PV1", fields: ["Set ID", "Patient Class", "Assigned Patient Location", "Admission Type", "Preadmit Number", "Prior Patient Location", "Attending Doctor", "Referring Doctor", "Consulting Doctor", "Hospital Service"] },
  { seg: "OBR", fields: ["Set ID", "Placer Order Number", "Filler Order Number", "Universal Service ID", "Priority", "Requested Date/Time", "Observation Date/Time", "Observation End Date/Time", "Collection Volume", "Collector Identifier"] },
  { seg: "OBX", fields: ["Set ID", "Value Type", "Observation Identifier", "Observation Sub-ID", "Observation Value", "Units", "References Range", "Abnormal Flags", "Probability", "Nature of Abnormal Test", "Observation Result Status"] },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Component ─────────────────────────────────────────────────────────────
export default function TransformerEditor({ steps, onChange, mode }: TransformerEditorProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set(["MSH", "PID"]));

  const isFilter = mode === "filter";
  const types = isFilter ? FILTER_TYPES : STEP_TYPES;

  const addStep = (type: string) => {
    const step: TransformerStep = {
      id: generateId(),
      type: type as TransformerStep["type"],
      name: `${types.find((t) => t.value === type)?.label ?? type} ${steps.length + 1}`,
      enabled: true,
      script: type === "javascript" ? (isFilter ? "// Return true to accept, false to filter\nreturn true;" : "// Transform the message\n// Access msg, tmp, channelMap, sourceMap\n") : undefined,
    };
    const updated = [...steps, step];
    onChange(updated);
    setSelectedIdx(updated.length - 1);
  };

  const updateStep = (idx: number, patch: Partial<TransformerStep>) => {
    onChange(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStep = (idx: number) => {
    onChange(steps.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const updated = [...steps];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onChange(updated);
    setSelectedIdx(newIdx);
  };

  const toggleSegment = (seg: string) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(seg)) next.delete(seg);
      else next.add(seg);
      return next;
    });
  };

  const selected = selectedIdx !== null ? steps[selectedIdx] : null;

  return (
    <div className="flex gap-4 h-[500px]">
      {/* Left: Inbound Message Tree */}
      <div className="w-56 shrink-0 rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-[var(--hb-border)] bg-[var(--hb-deep)]">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">Inbound Message</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-xs">
          {HL7_SEGMENTS.map((seg) => (
            <div key={seg.seg}>
              <button
                onClick={() => toggleSegment(seg.seg)}
                className="flex items-center gap-1 w-full px-2 py-1 rounded hover:bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] font-[family-name:var(--font-jetbrains)] font-medium"
              >
                <svg className={`w-3 h-3 transition-transform ${expandedSegments.has(seg.seg) ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 6l6 6-6 6z" />
                </svg>
                <span className="text-[var(--hb-teal)]">{seg.seg}</span>
              </button>
              {expandedSegments.has(seg.seg) && (
                <div className="ml-5 space-y-0.5">
                  {seg.fields.map((f, i) => (
                    <div
                      key={i}
                      className="px-2 py-0.5 rounded text-[var(--hb-text-tertiary)] hover:bg-[var(--hb-deep)] hover:text-[var(--hb-text-secondary)] cursor-pointer transition-colors truncate"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", `${seg.seg}.${i + 1}`)}
                      title={`${seg.seg}.${i + 1} - ${f}`}
                    >
                      <span className="text-[var(--hb-text-ghost)]">{i + 1}.</span> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center: Steps list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Steps header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">
            {isFilter ? "Filter Rules" : "Transformer Steps"} ({steps.length})
          </span>
          <div className="flex gap-1">
            {types.map((t) => (
              <button
                key={t.value}
                onClick={() => addStep(t.value)}
                className="text-[10px] font-medium bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-surface)] px-2 py-1 rounded transition-colors"
                title={t.desc}
              >
                + {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Steps list */}
        <div className="flex-1 rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden flex flex-col">
          {steps.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--hb-text-ghost)]">
              No {isFilter ? "filter rules" : "transformer steps"} configured. Add one above.
            </div>
          ) : (
            <>
              {/* Step list */}
              <div className="border-b border-[var(--hb-border)] divide-y divide-[var(--hb-border)]/50 max-h-36 overflow-y-auto">
                {steps.map((step, i) => (
                  <div
                    key={step.id}
                    onClick={() => setSelectedIdx(i)}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                      selectedIdx === i ? "bg-[var(--hb-teal)]/8" : "hover:bg-[var(--hb-surface)]/60"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.enabled ? "bg-[var(--hb-green)]" : "bg-[var(--hb-text-ghost)]"}`} />
                    <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-tertiary)] w-6 shrink-0">#{i + 1}</span>
                    <span className="text-xs text-[var(--hb-text-secondary)] truncate flex-1">{step.name}</span>
                    <span className="text-[10px] text-[var(--hb-text-ghost)] bg-[var(--hb-deep)] px-1.5 py-0.5 rounded shrink-0">{step.type}</span>
                  </div>
                ))}
              </div>

              {/* Step detail editor */}
              {selected && selectedIdx !== null && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={selected.name}
                      onChange={(e) => updateStep(selectedIdx, { name: e.target.value })}
                      className="text-sm font-medium text-[var(--hb-text-primary)] bg-transparent border-b border-[var(--hb-border)] focus:border-[var(--hb-teal)] outline-none pb-1"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveStep(selectedIdx, -1)} disabled={selectedIdx === 0} className="p-1 text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-primary)] disabled:opacity-30">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/></svg>
                      </button>
                      <button onClick={() => moveStep(selectedIdx, 1)} disabled={selectedIdx === steps.length - 1} className="p-1 text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-primary)] disabled:opacity-30">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                      </button>
                      <button onClick={() => updateStep(selectedIdx, { enabled: !selected.enabled })} className={`p-1 rounded ${selected.enabled ? "text-[var(--hb-green)]" : "text-[var(--hb-text-ghost)]"}`} title="Toggle">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      </button>
                      <button onClick={() => removeStep(selectedIdx)} className="p-1 text-[var(--hb-red)]/60 hover:text-[var(--hb-red)]">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Mapper fields */}
                  {(selected.type === "mapper" || selected.type === "message_builder") && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-[var(--hb-text-tertiary)] mb-1">Source Field</label>
                        <input
                          type="text"
                          value={selected.sourceField ?? ""}
                          onChange={(e) => updateStep(selectedIdx, { sourceField: e.target.value })}
                          placeholder="e.g., PID.5.1"
                          className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] outline-none"
                          onDrop={(e) => {
                            e.preventDefault();
                            const data = e.dataTransfer.getData("text/plain");
                            updateStep(selectedIdx, { sourceField: data });
                          }}
                          onDragOver={(e) => e.preventDefault()}
                        />
                      </div>
                      {selected.type === "mapper" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-[var(--hb-text-tertiary)] mb-1">Variable Name</label>
                            <input
                              type="text"
                              value={selected.targetVariable ?? ""}
                              onChange={(e) => updateStep(selectedIdx, { targetVariable: e.target.value })}
                              placeholder="e.g., patientName"
                              className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--hb-text-tertiary)] mb-1">Store In</label>
                            <select
                              value={selected.variableMap ?? "channelMap"}
                              onChange={(e) => updateStep(selectedIdx, { variableMap: e.target.value })}
                              className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none appearance-none"
                            >
                              {VARIABLE_MAPS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-[var(--hb-text-tertiary)] mb-1">Target Field</label>
                          <input
                            type="text"
                            value={selected.targetField ?? ""}
                            onChange={(e) => updateStep(selectedIdx, { targetField: e.target.value })}
                            placeholder="e.g., tmp['PID']['PID.5']['PID.5.1']"
                            className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rule Builder (filter mode) */}
                  {selected.type === "rule_builder" as string && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-[var(--hb-text-tertiary)] mb-1">Field</label>
                        <input
                          type="text"
                          value={(selected as unknown as FilterRule).field ?? ""}
                          onChange={(e) => updateStep(selectedIdx, { sourceField: e.target.value } as Partial<TransformerStep>)}
                          placeholder="e.g., MSH.9.1"
                          className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[var(--hb-text-tertiary)] mb-1">Condition</label>
                          <select
                            value={(selected as unknown as FilterRule).condition ?? "equals"}
                            onChange={(e) => updateStep(selectedIdx, { targetVariable: e.target.value } as Partial<TransformerStep>)}
                            className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none appearance-none"
                          >
                            {CONDITIONS.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--hb-text-tertiary)] mb-1">Value</label>
                          <input
                            type="text"
                            value={(selected as unknown as FilterRule).value ?? ""}
                            onChange={(e) => updateStep(selectedIdx, { targetField: e.target.value } as Partial<TransformerStep>)}
                            placeholder="e.g., ADT"
                            className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* JavaScript editor */}
                  {selected.type === "javascript" && (
                    <div className="rounded-lg border border-[var(--hb-border)] overflow-hidden" style={{ height: 200 }}>
                      <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        value={selected.script ?? ""}
                        onChange={(v) => updateStep(selectedIdx, { script: v ?? "" })}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12,
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          tabSize: 2,
                          automaticLayout: true,
                          padding: { top: 8 },
                        }}
                      />
                    </div>
                  )}

                  {/* XSLT editor */}
                  {selected.type === "xslt" && (
                    <div className="rounded-lg border border-[var(--hb-border)] overflow-hidden" style={{ height: 200 }}>
                      <Editor
                        height="100%"
                        defaultLanguage="xml"
                        value={selected.stylesheet ?? ""}
                        onChange={(v) => updateStep(selectedIdx, { stylesheet: v ?? "" })}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12,
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 8 },
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Outbound Message Tree */}
      <div className="w-56 shrink-0 rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-[var(--hb-border)] bg-[var(--hb-deep)]">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">Outbound Message</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-xs">
          {HL7_SEGMENTS.map((seg) => (
            <div key={seg.seg}>
              <button
                onClick={() => toggleSegment(`out_${seg.seg}`)}
                className="flex items-center gap-1 w-full px-2 py-1 rounded hover:bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] font-[family-name:var(--font-jetbrains)] font-medium"
              >
                <svg className={`w-3 h-3 transition-transform ${expandedSegments.has(`out_${seg.seg}`) ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 6l6 6-6 6z" />
                </svg>
                <span className="text-[var(--hb-green)]">{seg.seg}</span>
              </button>
              {expandedSegments.has(`out_${seg.seg}`) && (
                <div className="ml-5 space-y-0.5">
                  {seg.fields.map((f, i) => (
                    <div
                      key={i}
                      className="px-2 py-0.5 rounded text-[var(--hb-text-tertiary)] hover:bg-[var(--hb-deep)] hover:text-[var(--hb-text-secondary)] cursor-pointer transition-colors truncate"
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceField = e.dataTransfer.getData("text/plain");
                        if (sourceField && selectedIdx !== null) {
                          updateStep(selectedIdx, { targetField: `${seg.seg}.${i + 1}` });
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      title={`${seg.seg}.${i + 1} - ${f}`}
                    >
                      <span className="text-[var(--hb-text-ghost)]">{i + 1}.</span> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
