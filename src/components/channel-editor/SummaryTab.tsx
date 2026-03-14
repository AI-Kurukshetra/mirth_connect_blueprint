"use client";

// ── Data types ────────────────────────────────────────────────────────────
const DATA_TYPES = [
  { value: "hl7v2", label: "HL7 v2.x" },
  { value: "hl7v3", label: "HL7 v3 / CDA" },
  { value: "fhir", label: "FHIR R4" },
  { value: "xml", label: "XML" },
  { value: "json", label: "JSON" },
  { value: "delimited", label: "Delimited Text" },
  { value: "raw", label: "Raw" },
  { value: "x12", label: "X12 / EDI" },
  { value: "ncpdp", label: "NCPDP" },
  { value: "dicom", label: "DICOM" },
];

const STORAGE_MODES = [
  { value: "development", label: "Development", desc: "Store everything — raw, transformed, encoded, sent, response, maps" },
  { value: "production", label: "Production", desc: "Store most data, reduced verbosity" },
  { value: "raw", label: "Raw", desc: "Store only raw inbound message" },
  { value: "metadata", label: "Metadata Only", desc: "Store metadata and status, no message content" },
  { value: "disabled", label: "Disabled", desc: "No message storage at all" },
];

const INITIAL_STATES = [
  { value: "started", label: "Started", color: "text-[var(--hb-green)]" },
  { value: "stopped", label: "Stopped", color: "text-[var(--hb-text-secondary)]" },
  { value: "paused", label: "Paused", color: "text-[var(--hb-amber)]" },
];

// ── Types ─────────────────────────────────────────────────────────────────
export interface ChannelSummary {
  name: string;
  description: string;
  inbound_data_type: string;
  outbound_data_type: string;
  initial_state: string;
  message_storage_mode: string;
  content_encryption: boolean;
  prune_content_days: number | null;
  prune_metadata_days: number | null;
  tags: string[];
}

interface SummaryTabProps {
  data: ChannelSummary;
  onChange: (data: ChannelSummary) => void;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function SummaryTab({ data, onChange }: SummaryTabProps) {
  const set = <K extends keyof ChannelSummary>(key: K, val: ChannelSummary[K]) =>
    onChange({ ...data, [key]: val });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
      {/* ── Left column ─────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Channel Identity */}
        <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Channel Identity</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">
                Channel Name <span className="text-[var(--hb-red)]">*</span>
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g., ADT Feed — Main Hospital"
                className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] focus:ring-1 focus:ring-[var(--hb-teal)]/40 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">Description</label>
              <textarea
                value={data.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe what this channel does…"
                rows={3}
                className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] focus:ring-1 focus:ring-[var(--hb-teal)]/40 outline-none resize-none"
              />
            </div>
          </div>
        </section>

        {/* Data Types */}
        <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Data Types</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">Inbound</label>
              <select
                value={data.inbound_data_type}
                onChange={(e) => set("inbound_data_type", e.target.value)}
                className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none appearance-none"
              >
                {DATA_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">Outbound</label>
              <select
                value={data.outbound_data_type}
                onChange={(e) => set("outbound_data_type", e.target.value)}
                className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none appearance-none"
              >
                {DATA_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Tags */}
        <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {data.tags.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--hb-teal)]/15 text-[var(--hb-teal)] border border-[var(--hb-teal)]/25 px-2.5 py-1 text-xs font-medium">
                {tag}
                <button
                  type="button"
                  onClick={() => set("tags", data.tags.filter((_, j) => j !== i))}
                  className="hover:text-[var(--hb-red)] transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Type a tag and press Enter…"
            className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = e.currentTarget.value.trim();
                if (v && !data.tags.includes(v)) {
                  set("tags", [...data.tags, v]);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </section>
      </div>

      {/* ── Right column ────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Initial State */}
        <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Initial State</h3>
          <div className="flex gap-2">
            {INITIAL_STATES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("initial_state", s.value)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  data.initial_state === s.value
                    ? `border-[var(--hb-teal)] bg-[var(--hb-teal)]/10 ${s.color}`
                    : "border-[var(--hb-border)] bg-[var(--hb-surface)]/60 text-[var(--hb-text-tertiary)] hover:border-[var(--hb-border-bright)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* Message Storage */}
        <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Message Storage</h3>
          <div className="space-y-2">
            {STORAGE_MODES.map((m) => (
              <label
                key={m.value}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                  data.message_storage_mode === m.value
                    ? "border-[var(--hb-teal)]/50 bg-[var(--hb-teal)]/5"
                    : "border-[var(--hb-border-subtle)] bg-[var(--hb-surface)]/60 hover:border-[var(--hb-border-bright)]"
                }`}
              >
                <input
                  type="radio"
                  name="storage_mode"
                  value={m.value}
                  checked={data.message_storage_mode === m.value}
                  onChange={() => set("message_storage_mode", m.value)}
                  className="sr-only"
                />
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  data.message_storage_mode === m.value ? "border-[var(--hb-teal)]" : "border-[var(--hb-border-bright)]"
                }`}>
                  {data.message_storage_mode === m.value && <div className="w-2 h-2 rounded-full bg-[var(--hb-teal)]" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--hb-text-secondary)]">{m.label}</div>
                  <div className="text-xs text-[var(--hb-text-ghost)]">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Security & Pruning */}
        <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Security &amp; Pruning</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-[var(--hb-text-secondary)]">Content Encryption</span>
              <button
                type="button"
                role="switch"
                aria-checked={data.content_encryption}
                onClick={() => set("content_encryption", !data.content_encryption)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  data.content_encryption ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border-bright)]"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  data.content_encryption ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">Prune Content (days)</label>
                <input
                  type="number"
                  value={data.prune_content_days ?? ""}
                  onChange={(e) => set("prune_content_days", e.target.value ? Number(e.target.value) : null)}
                  placeholder="∞"
                  className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">Prune Metadata (days)</label>
                <input
                  type="number"
                  value={data.prune_metadata_days ?? ""}
                  onChange={(e) => set("prune_metadata_days", e.target.value ? Number(e.target.value) : null)}
                  placeholder="∞"
                  className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] placeholder:text-[var(--hb-text-ghost)] focus:border-[var(--hb-teal)] outline-none"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
