"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface FHIRRow {
  id: string;
  resource_type: string;
  resource_id: string;
  resource_data: Record<string, unknown>;
  source_message_type: string | null;
  created_at: string;
}

const RESOURCE_TYPES = [
  "All",
  "Patient",
  "Encounter",
  "Observation",
  "DiagnosticReport",
  "ServiceRequest",
  "Condition",
  "Procedure",
  "AllergyIntolerance",
  "MedicationRequest",
];

export default function FHIRBrowserPage() {
  const [resources, setResources] = useState<FHIRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let query = supabase
      .from("fhir_resources")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter !== "All") {
      query = query.eq("resource_type", filter);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setResources([]);
    } else {
      setResources((data as FHIRRow[]) || []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const deleteResource = async (row: FHIRRow) => {
    if (!confirm(`Delete ${row.resource_type}/${row.resource_id}?`)) return;
    const res = await fetch(`/api/fhir/${row.resource_type}/${row.resource_id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchResources();
    }
  };

  // Group by resource type
  const grouped = resources.reduce<Record<string, FHIRRow[]>>((acc, row) => {
    const key = row.resource_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[var(--hb-obsidian)] text-[var(--hb-text-primary)]">
      <div className="max-w-7xl mx-auto px-6 py-8 hb-animate-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--hb-text-primary)]">FHIR Resource Browser</h1>
            <p className="text-[var(--hb-text-secondary)] text-sm mt-1">
              View and manage FHIR R4 resources stored in the system
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="hb-input bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg px-3 py-2 text-sm text-[var(--hb-text-primary)] focus:outline-none focus:border-[var(--hb-teal)] focus:shadow-[0_0_0_3px_rgba(0,212,170,0.08)]"
            >
              {RESOURCE_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
            <button
              onClick={fetchResources}
              className="hb-btn-primary bg-[var(--hb-teal-dim)] hover:bg-[var(--hb-teal)] text-[var(--hb-text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-[var(--hb-red)]/10 border border-[var(--hb-red)]/30 rounded-lg p-4 mb-6">
            <p className="text-[var(--hb-red)] text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--hb-teal)]" />
          </div>
        ) : resources.length === 0 ? (
          <div className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-12 text-center">
            <p className="text-[var(--hb-text-secondary)] text-lg">No FHIR resources found</p>
            <p className="text-[var(--hb-text-tertiary)] text-sm mt-2">
              Transform HL7 messages to create FHIR resources
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, rows], groupIndex) => (
              <div key={type} className={`rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden hb-stagger-${Math.min(groupIndex + 1, 5)}`}>
                <div className="px-5 py-3 border-b border-[var(--hb-border)] flex items-center justify-between bg-[var(--hb-deep)]">
                  <div className="flex items-center gap-3">
                    <span className="bg-[var(--hb-teal-dim)]/20 text-[var(--hb-teal)] px-2.5 py-0.5 rounded-full text-xs font-medium font-[family-name:var(--font-jetbrains)]">
                      {type}
                    </span>
                    <span className="text-[var(--hb-text-tertiary)] text-sm font-[family-name:var(--font-jetbrains)]">{rows.length} resource{rows.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="divide-y divide-[var(--hb-border)]">
                  {rows.map((row) => (
                    <div key={row.id} className="hover:bg-[var(--hb-elevated)]/50 transition-colors">
                      <div
                        className="px-5 py-3 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpand(row.id)}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-tertiary)] shrink-0">
                            {expandedIds.has(row.id) ? "v" : ">"}
                          </span>
                          <span className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-primary)] truncate">
                            {row.resource_type}/{row.resource_id}
                          </span>
                          {row.source_message_type && (
                            <span className="text-xs bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] px-2 py-0.5 rounded font-[family-name:var(--font-jetbrains)]">
                              from {row.source_message_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-[var(--hb-text-tertiary)] font-[family-name:var(--font-jetbrains)]">
                            {new Date(row.created_at).toLocaleString()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteResource(row);
                            }}
                            className="text-[var(--hb-red)]/60 hover:text-[var(--hb-red)] text-xs transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {expandedIds.has(row.id) && (
                        <div className="px-5 pb-4">
                          <pre className="bg-[var(--hb-obsidian)] border border-[var(--hb-border)] rounded-lg p-4 text-xs text-[var(--hb-green)] overflow-x-auto max-h-96 font-[family-name:var(--font-jetbrains)]">
                            {JSON.stringify(row.resource_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-[var(--hb-text-ghost)] text-xs font-[family-name:var(--font-jetbrains)]">
          Total: {resources.length} resources across {Object.keys(grouped).length} types
        </div>
      </div>
    </div>
  );
}
