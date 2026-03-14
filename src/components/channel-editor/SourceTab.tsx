"use client";

import { useState } from "react";
import ConnectorForm, { SOURCE_CONNECTORS } from "./ConnectorForm";
import TransformerEditor, { type TransformerStep } from "./TransformerEditor";

// ── Types ─────────────────────────────────────────────────────────────────
export interface SourceConfig {
  source_connector_type: string;
  source_connector_properties: Record<string, unknown>;
  source_queue_enabled: boolean;
  source_response: string;
  source_filter?: TransformerStep[];
  source_transformer?: TransformerStep[];
}

interface SourceTabProps {
  data: SourceConfig;
  onChange: (data: SourceConfig) => void;
}

// ── Sub-sections ─────────────────────────────────────────────────────────
const SOURCE_SECTIONS = [
  { key: "connector", label: "Connector" },
  { key: "filter", label: "Filter" },
  { key: "transformer", label: "Transformer" },
] as const;

type SourceSection = (typeof SOURCE_SECTIONS)[number]["key"];

// ── Component ─────────────────────────────────────────────────────────────
export default function SourceTab({ data, onChange }: SourceTabProps) {
  const [section, setSection] = useState<SourceSection>("connector");
  const set = <K extends keyof SourceConfig>(key: K, val: SourceConfig[K]) =>
    onChange({ ...data, [key]: val });

  const activeConnector = SOURCE_CONNECTORS.find((c) => c.value === data.source_connector_type);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Section tabs */}
      <div className="flex gap-1 border-b border-[var(--hb-border)] pb-0">
        {SOURCE_SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              section === s.key ? "text-[var(--hb-text-primary)]" : "text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-secondary)]"
            }`}
          >
            {s.label}
            {s.key !== "connector" && (data[s.key === "filter" ? "source_filter" : "source_transformer"]?.length ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] bg-[var(--hb-teal)]/20 text-[var(--hb-teal)] px-1.5 py-0.5 rounded-full">
                {(data[s.key === "filter" ? "source_filter" : "source_transformer"] ?? []).length}
              </span>
            )}
            {section === s.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--hb-teal)] rounded-full" />}
          </button>
        ))}
      </div>

      {/* Filter section */}
      {section === "filter" && (
        <TransformerEditor
          steps={data.source_filter ?? []}
          onChange={(steps) => set("source_filter", steps)}
          mode="filter"
        />
      )}

      {/* Transformer section */}
      {section === "transformer" && (
        <TransformerEditor
          steps={data.source_transformer ?? []}
          onChange={(steps) => set("source_transformer", steps)}
          mode="transformer"
        />
      )}

      {/* Connector section */}
      {section === "connector" && <>
      {/* Connector Type Selector */}
      <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
        <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Source Connector Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SOURCE_CONNECTORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => set("source_connector_type", c.value)}
              className={`rounded-lg border p-3 text-left transition-all ${
                data.source_connector_type === c.value
                  ? "border-[var(--hb-teal)]/60 bg-[var(--hb-teal)]/8 ring-1 ring-[var(--hb-teal)]/20"
                  : "border-[var(--hb-border-subtle)] bg-[var(--hb-surface)]/60 hover:border-[var(--hb-border-bright)]"
              }`}
            >
              <div className={`text-sm font-medium mb-0.5 ${
                data.source_connector_type === c.value ? "text-[var(--hb-teal)]" : "text-[var(--hb-text-secondary)]"
              }`}>
                {c.label}
              </div>
              <div className="text-xs text-[var(--hb-text-ghost)] line-clamp-2">{c.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Connector Properties */}
      <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">
            {activeConnector?.label ?? "Connector"} Properties
          </h3>
          <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] bg-[var(--hb-deep)] px-2 py-0.5 rounded">
            {data.source_connector_type}
          </span>
        </div>
        <ConnectorForm
          connectorType={data.source_connector_type}
          properties={data.source_connector_properties}
          onChange={(props) => set("source_connector_properties", props)}
        />
      </section>

      {/* Source Queue & Response */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Source Queue</h3>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-[var(--hb-text-secondary)]">Enable Source Queue</span>
              <p className="text-xs text-[var(--hb-text-ghost)] mt-0.5">Store-and-forward: ACK immediately, process async</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={data.source_queue_enabled}
              onClick={() => set("source_queue_enabled", !data.source_queue_enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                data.source_queue_enabled ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border-bright)]"
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                data.source_queue_enabled ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </label>
        </section>

        <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Response Settings</h3>
          <div>
            <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">Response Source</label>
            <select
              value={data.source_response}
              onChange={(e) => set("source_response", e.target.value)}
              className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none appearance-none"
            >
              <option value="auto">Auto-generate (default ACK)</option>
              <option value="none">None</option>
              <option value="destination_1">From Destination 1</option>
              <option value="destination_2">From Destination 2</option>
              <option value="postprocessor">Postprocessor Response</option>
            </select>
          </div>
        </section>
      </div>
      </>}
    </div>
  );
}
