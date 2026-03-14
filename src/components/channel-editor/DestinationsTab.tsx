"use client";

import { useState } from "react";
import ConnectorForm, { DEST_CONNECTORS } from "./ConnectorForm";
import TransformerEditor, { type TransformerStep } from "./TransformerEditor";

// ── Types ─────────────────────────────────────────────────────────────────
export interface Destination {
  id?: string;
  name: string;
  sort_order: number;
  enabled: boolean;
  connector_type: string;
  connector_properties: Record<string, unknown>;
  filter?: TransformerStep[];
  transformer?: TransformerStep[];
  response_transformer?: TransformerStep[];
  queue_enabled: boolean;
  retry_count: number;
  retry_interval_ms: number;
  rotate_queue: boolean;
  queue_thread_count: number;
  inbound_data_type: string;
  outbound_data_type: string;
}

interface DestinationsTabProps {
  destinations: Destination[];
  onChange: (destinations: Destination[]) => void;
}

function newDestination(index: number): Destination {
  return {
    name: `Destination ${index + 1}`,
    sort_order: index,
    enabled: true,
    connector_type: "tcp_sender",
    connector_properties: {},
    queue_enabled: false,
    retry_count: 0,
    retry_interval_ms: 10000,
    rotate_queue: false,
    queue_thread_count: 1,
    inbound_data_type: "hl7v2",
    outbound_data_type: "hl7v2",
  };
}

const DEST_SECTIONS = [
  { key: "connector", label: "Connector" },
  { key: "filter", label: "Filter" },
  { key: "transformer", label: "Transformer" },
  { key: "response", label: "Response" },
] as const;

type DestSection = (typeof DEST_SECTIONS)[number]["key"];

// ── Component ─────────────────────────────────────────────────────────────
export default function DestinationsTab({ destinations, onChange }: DestinationsTabProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [destSection, setDestSection] = useState<DestSection>("connector");

  const addDestination = () => {
    const updated = [...destinations, newDestination(destinations.length)];
    onChange(updated);
    setActiveIdx(updated.length - 1);
  };

  const removeDestination = (idx: number) => {
    if (destinations.length <= 1) return;
    const updated = destinations.filter((_, i) => i !== idx).map((d, i) => ({ ...d, sort_order: i }));
    onChange(updated);
    setActiveIdx(Math.min(activeIdx, updated.length - 1));
  };

  const updateDest = (idx: number, patch: Partial<Destination>) => {
    const updated = destinations.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onChange(updated);
  };

  const moveDestination = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= destinations.length) return;
    const updated = [...destinations];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((d, i) => (d.sort_order = i));
    onChange(updated);
    setActiveIdx(newIdx);
  };

  const dest = destinations[activeIdx];

  return (
    <div className="max-w-5xl">
      {/* Destination list header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">
          {destinations.length} Destination{destinations.length !== 1 ? "s" : ""}
        </h3>
        <button
          type="button"
          onClick={addDestination}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hb-border)] bg-[var(--hb-deep)] px-3 py-1.5 text-xs font-medium text-[var(--hb-text-secondary)] hover:bg-[var(--hb-surface)] hover:text-[var(--hb-text-primary)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Destination
        </button>
      </div>

      {/* Destination tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {destinations.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={`relative group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-all ${
              activeIdx === i
                ? "border-[var(--hb-teal)]/50 bg-[var(--hb-teal)]/8 text-[var(--hb-teal)]"
                : "border-[var(--hb-border-subtle)] bg-[var(--hb-surface)]/60 text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-secondary)] hover:border-[var(--hb-border-bright)]"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${d.enabled ? "bg-[var(--hb-green)]" : "bg-[var(--hb-text-ghost)]"}`} />
            {d.name}
            <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">
              {DEST_CONNECTORS.find((c) => c.value === d.connector_type)?.label.split(" ")[0] ?? d.connector_type}
            </span>
          </button>
        ))}
      </div>

      {/* Active destination editor */}
      {dest && (
        <div className="space-y-6">
          {/* Destination header */}
          <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
            {/* Sub-section tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--hb-border)] pb-0">
              {DEST_SECTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setDestSection(s.key)}
                  className={`relative px-3 py-1.5 text-xs font-medium transition-colors ${
                    destSection === s.key ? "text-[var(--hb-text-primary)]" : "text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-secondary)]"
                  }`}
                >
                  {s.label}
                  {destSection === s.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--hb-green)] rounded-full" />}
                </button>
              ))}
            </div>
          </section>

          {/* Filter section */}
          {destSection === "filter" && (
            <TransformerEditor
              steps={dest.filter ?? []}
              onChange={(steps) => updateDest(activeIdx, { filter: steps })}
              mode="filter"
            />
          )}

          {/* Transformer section */}
          {destSection === "transformer" && (
            <TransformerEditor
              steps={dest.transformer ?? []}
              onChange={(steps) => updateDest(activeIdx, { transformer: steps })}
              mode="transformer"
            />
          )}

          {/* Response Transformer section */}
          {destSection === "response" && (
            <TransformerEditor
              steps={dest.response_transformer ?? []}
              onChange={(steps) => updateDest(activeIdx, { response_transformer: steps })}
              mode="transformer"
            />
          )}

          {/* Connector section */}
          {destSection === "connector" && <>
          <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">Destination Configuration</h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveDestination(activeIdx, -1)}
                  disabled={activeIdx === 0}
                  className="p-1 rounded text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveDestination(activeIdx, 1)}
                  disabled={activeIdx === destinations.length - 1}
                  className="p-1 rounded text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeDestination(activeIdx)}
                  disabled={destinations.length <= 1}
                  className="p-1 rounded text-[var(--hb-red)]/60 hover:text-[var(--hb-red)] disabled:opacity-30 disabled:cursor-not-allowed ml-2"
                  title="Remove destination"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">Name</label>
                <input
                  type="text"
                  value={dest.name}
                  onChange={(e) => updateDest(activeIdx, { name: e.target.value })}
                  className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-3 py-2 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none"
                />
              </div>
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-[var(--hb-text-tertiary)] mb-1.5">
                  Enabled
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dest.enabled}
                  onClick={() => updateDest(activeIdx, { enabled: !dest.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    dest.enabled ? "bg-[var(--hb-green)]" : "bg-[var(--hb-border-bright)]"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    dest.enabled ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Connector type */}
          <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Connector Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DEST_CONNECTORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateDest(activeIdx, { connector_type: c.value, connector_properties: {} })}
                  className={`rounded-lg border p-2.5 text-left transition-all ${
                    dest.connector_type === c.value
                      ? "border-[var(--hb-green)]/50 bg-[var(--hb-green)]/8 ring-1 ring-[var(--hb-green)]/20"
                      : "border-[var(--hb-border-subtle)] bg-[var(--hb-surface)]/60 hover:border-[var(--hb-border-bright)]"
                  }`}
                >
                  <div className={`text-xs font-medium ${
                    dest.connector_type === c.value ? "text-[var(--hb-green)]" : "text-[var(--hb-text-secondary)]"
                  }`}>
                    {c.label}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Connector Properties */}
          <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">
              {DEST_CONNECTORS.find((c) => c.value === dest.connector_type)?.label ?? ""} Properties
            </h3>
            <ConnectorForm
              connectorType={dest.connector_type}
              properties={dest.connector_properties}
              onChange={(props) => updateDest(activeIdx, { connector_properties: props })}
            />
          </section>

          {/* Queue Settings */}
          <section className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-4">Queue Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-[var(--hb-text-secondary)]">Enable Destination Queue</span>
                  <p className="text-xs text-[var(--hb-text-ghost)] mt-0.5">Failed messages will be queued for retry</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dest.queue_enabled}
                  onClick={() => updateDest(activeIdx, { queue_enabled: !dest.queue_enabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    dest.queue_enabled ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border-bright)]"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    dest.queue_enabled ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </label>

              {dest.queue_enabled && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[var(--hb-border)]">
                  <div>
                    <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1">Retry Count</label>
                    <input
                      type="number"
                      value={dest.retry_count}
                      onChange={(e) => updateDest(activeIdx, { retry_count: Number(e.target.value) })}
                      className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1">Retry Interval (ms)</label>
                    <input
                      type="number"
                      value={dest.retry_interval_ms}
                      onChange={(e) => updateDest(activeIdx, { retry_interval_ms: Number(e.target.value) })}
                      className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--hb-text-tertiary)] mb-1">Thread Count</label>
                    <input
                      type="number"
                      value={dest.queue_thread_count}
                      onChange={(e) => updateDest(activeIdx, { queue_thread_count: Number(e.target.value) })}
                      className="w-full rounded-md bg-[var(--hb-deep)] border border-[var(--hb-border)] px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] focus:border-[var(--hb-teal)] outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                      <input
                        type="checkbox"
                        checked={dest.rotate_queue}
                        onChange={(e) => updateDest(activeIdx, { rotate_queue: e.target.checked })}
                        className="rounded border-[var(--hb-border-bright)] bg-[var(--hb-deep)] text-[var(--hb-teal)] focus:ring-[var(--hb-teal)]/40"
                      />
                      <span className="text-xs text-[var(--hb-text-secondary)]">Rotate Queue</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </section>
          </>}
        </div>
      )}

      {destinations.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--hb-border)] bg-[var(--hb-surface)]/30 p-12 text-center">
          <p className="text-sm text-[var(--hb-text-tertiary)] mb-4">No destinations configured</p>
          <button
            type="button"
            onClick={addDestination}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--hb-teal-dim)] px-4 py-2 text-sm font-medium text-[var(--hb-text-primary)] hover:bg-[var(--hb-teal)] transition-colors"
          >
            Add First Destination
          </button>
        </div>
      )}
    </div>
  );
}
