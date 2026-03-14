"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { SAMPLE_MESSAGES } from "@/lib/hl7/samples";

type TabMode = "parsed" | "validated" | "fhir";

interface ValidationItem {
  severity: "error" | "warning" | "info";
  segment?: string;
  field?: number;
  message: string;
  code: string;
}

interface ValidationReport {
  valid: boolean;
  errors: ValidationItem[];
  warnings: ValidationItem[];
  infos: ValidationItem[];
  all: ValidationItem[];
}

export default function TransformationsPage() {
  const [hl7Input, setHl7Input] = useState(SAMPLE_MESSAGES[0].message);
  const [outputJSON, setOutputJSON] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabMode>("parsed");
  const [loading, setLoading] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const callAPI = useCallback(
    async (endpoint: string, tab: TabMode) => {
      setLoading(true);
      setError(null);
      setStatusMessage(null);
      setActiveTab(tab);
      setValidationReport(null);

      try {
        const res = await fetch(`/api/hl7/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: hl7Input }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || data.errors?.join(", ") || "Request failed");
          setOutputJSON(JSON.stringify(data, null, 2));
          return;
        }

        if (tab === "validated") {
          setValidationReport(data.data as ValidationReport);
          setOutputJSON(JSON.stringify(data.data, null, 2));
        } else if (tab === "fhir") {
          setOutputJSON(JSON.stringify(data.bundle || data, null, 2));
          if (data.savedResources?.length > 0) {
            setStatusMessage(
              `Saved ${data.savedResources.length} FHIR resources to database`
            );
          }
        } else {
          setOutputJSON(JSON.stringify(data.data || data, null, 2));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [hl7Input]
  );

  const handleParse = () => callAPI("parse", "parsed");
  const handleValidate = () => callAPI("validate", "validated");
  const handleTransform = () => callAPI("transform", "fhir");

  const loadSample = (id: string) => {
    const sample = SAMPLE_MESSAGES.find((s) => s.id === id);
    if (sample) {
      setHl7Input(sample.message);
      setOutputJSON("");
      setValidationReport(null);
      setError(null);
      setStatusMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--hb-obsidian)] text-[var(--hb-text-primary)] flex flex-col hb-animate-in">
      {/* Header */}
      <div className="border-b border-[var(--hb-border)] bg-[var(--hb-deep)] px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--hb-text-primary)]">HL7 Transformation Engine</h1>
            <p className="text-[var(--hb-text-secondary)] text-sm mt-0.5">
              Parse, validate, and transform HL7 v2.x messages to FHIR R4
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              onChange={(e) => loadSample(e.target.value)}
              defaultValue=""
              className="hb-input bg-[var(--hb-elevated)] border border-[var(--hb-border)] rounded-lg px-3 py-2 text-sm text-[var(--hb-text-primary)] focus:outline-none focus:border-[var(--hb-teal)] focus:shadow-[0_0_0_3px_rgba(0,212,170,0.08)]"
            >
              <option value="" disabled>
                Load sample message...
              </option>
              {SAMPLE_MESSAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleParse}
              disabled={loading}
              className="hb-btn-ghost bg-[var(--hb-elevated)] hover:bg-[var(--hb-deep)] disabled:opacity-50 text-[var(--hb-text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Parse
            </button>
            <button
              onClick={handleValidate}
              disabled={loading}
              className="bg-[var(--hb-amber)]/80 hover:bg-[var(--hb-amber)] disabled:opacity-50 text-[var(--hb-text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Validate
            </button>
            <button
              onClick={handleTransform}
              disabled={loading}
              className="hb-btn-primary bg-[var(--hb-teal-dim)] hover:bg-[var(--hb-teal)] disabled:opacity-50 text-[var(--hb-text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Transform to FHIR
            </button>
          </div>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mx-6 mt-4 bg-[var(--hb-red)]/10 border border-[var(--hb-red)]/30 rounded-lg px-4 py-2">
          <span className="text-[var(--hb-red)] text-sm">{error}</span>
        </div>
      )}
      {statusMessage && (
        <div className="mx-6 mt-4 bg-[var(--hb-green)]/10 border border-[var(--hb-green)]/30 rounded-lg px-4 py-2">
          <span className="text-[var(--hb-green)] text-sm">{statusMessage}</span>
        </div>
      )}

      {/* Split Pane */}
      <div className="flex-1 flex min-h-0" style={{ height: "calc(100vh - 140px)" }}>
        {/* Left: HL7 Input */}
        <div className="w-1/2 border-r border-[var(--hb-border)] flex flex-col">
          <div className="px-4 py-2 border-b border-[var(--hb-border)] bg-[var(--hb-deep)]/50 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">
              HL7 v2.x Input
            </span>
            <span className="text-xs text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">
              {hl7Input.split(/\r|\n/).filter((l) => l.trim()).length} segments
            </span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={hl7Input}
              onChange={(val) => setHl7Input(val || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
            />
          </div>
        </div>

        {/* Right: Output */}
        <div className="w-1/2 flex flex-col">
          {/* Tabs */}
          <div className="px-4 py-2 border-b border-[var(--hb-border)] bg-[var(--hb-deep)]/50 flex items-center gap-4">
            <button
              onClick={() => setActiveTab("parsed")}
              className={`text-xs font-medium uppercase tracking-wider pb-0.5 border-b-2 transition-colors font-[family-name:var(--font-jetbrains)] ${
                activeTab === "parsed"
                  ? "text-[var(--hb-teal)] border-[var(--hb-teal)]"
                  : "text-[var(--hb-text-tertiary)] border-transparent hover:text-[var(--hb-text-secondary)]"
              }`}
            >
              Parsed
            </button>
            <button
              onClick={() => setActiveTab("validated")}
              className={`text-xs font-medium uppercase tracking-wider pb-0.5 border-b-2 transition-colors font-[family-name:var(--font-jetbrains)] ${
                activeTab === "validated"
                  ? "text-[var(--hb-amber)] border-[var(--hb-amber)]"
                  : "text-[var(--hb-text-tertiary)] border-transparent hover:text-[var(--hb-text-secondary)]"
              }`}
            >
              Validation
            </button>
            <button
              onClick={() => setActiveTab("fhir")}
              className={`text-xs font-medium uppercase tracking-wider pb-0.5 border-b-2 transition-colors font-[family-name:var(--font-jetbrains)] ${
                activeTab === "fhir"
                  ? "text-[var(--hb-green)] border-[var(--hb-green)]"
                  : "text-[var(--hb-text-tertiary)] border-transparent hover:text-[var(--hb-text-secondary)]"
              }`}
            >
              FHIR Output
            </button>
          </div>

          {/* Validation results panel */}
          {activeTab === "validated" && validationReport && (
            <div className="border-b border-[var(--hb-border)] px-4 py-3 space-y-2 max-h-60 overflow-y-auto bg-[var(--hb-deep)]/30">
              <div className="flex items-center gap-4 text-sm">
                <span
                  className={`font-semibold font-[family-name:var(--font-jetbrains)] ${
                    validationReport.valid ? "text-[var(--hb-green)]" : "text-[var(--hb-red)]"
                  }`}
                >
                  {validationReport.valid ? "VALID" : "INVALID"}
                </span>
                {validationReport.errors.length > 0 && (
                  <span className="text-[var(--hb-red)] text-xs font-[family-name:var(--font-jetbrains)]">
                    {validationReport.errors.length} error{validationReport.errors.length !== 1 ? "s" : ""}
                  </span>
                )}
                {validationReport.warnings.length > 0 && (
                  <span className="text-[var(--hb-amber)] text-xs font-[family-name:var(--font-jetbrains)]">
                    {validationReport.warnings.length} warning{validationReport.warnings.length !== 1 ? "s" : ""}
                  </span>
                )}
                {validationReport.infos.length > 0 && (
                  <span className="text-[var(--hb-teal)] text-xs font-[family-name:var(--font-jetbrains)]">
                    {validationReport.infos.length} info
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {validationReport.all.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 ${
                      item.severity === "error"
                        ? "bg-[var(--hb-red)]/10 text-[var(--hb-red)]/80"
                        : item.severity === "warning"
                        ? "bg-[var(--hb-amber)]/10 text-[var(--hb-amber)]/80"
                        : "bg-[var(--hb-teal)]/10 text-[var(--hb-teal)]/80"
                    }`}
                  >
                    <span
                      className={`font-bold uppercase shrink-0 mt-px font-[family-name:var(--font-jetbrains)] ${
                        item.severity === "error"
                          ? "text-[var(--hb-red)]"
                          : item.severity === "warning"
                          ? "text-[var(--hb-amber)]"
                          : "text-[var(--hb-teal)]"
                      }`}
                    >
                      {item.severity === "error" ? "ERR" : item.severity === "warning" ? "WRN" : "INF"}
                    </span>
                    <span>
                      {item.segment && (
                        <span className="font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">
                          {item.segment}
                          {item.field !== undefined ? `.${item.field}` : ""}:{" "}
                        </span>
                      )}
                      {item.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JSON Output */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--hb-teal)]" />
              </div>
            ) : outputJSON ? (
              <Editor
                height="100%"
                defaultLanguage="json"
                value={outputJSON}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  padding: { top: 12 },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--hb-text-ghost)] text-sm">
                Click Parse, Validate, or Transform to see output
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
