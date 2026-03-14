"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────
export interface ChannelScripts {
  deploy_script: string;
  undeploy_script: string;
  preprocessor_script: string;
  postprocessor_script: string;
}

interface ScriptsTabProps {
  data: ChannelScripts;
  onChange: (data: ChannelScripts) => void;
}

const SCRIPT_TABS = [
  {
    key: "deploy_script" as const,
    label: "Deploy",
    desc: "Runs when the channel is deployed/started. Use to initialize connections, caches, or state.",
    template: `// Deploy Script
// Runs once when the channel is deployed or started.
// Use to initialize objects, external connections, or cached data.

// Example:
// globalChannelMap.put('startTime', new Date().toISOString());
// logger.info('Channel deployed successfully');
`,
  },
  {
    key: "undeploy_script" as const,
    label: "Undeploy",
    desc: "Runs when the channel is undeployed/stopped. Use for cleanup.",
    template: `// Undeploy Script
// Runs once when the channel is undeployed or stopped.
// Use to close connections, flush caches, or perform cleanup.

// Example:
// logger.info('Channel shutting down');
`,
  },
  {
    key: "preprocessor_script" as const,
    label: "Preprocessor",
    desc: "Runs for every message BEFORE filters and transformers. Modify the raw incoming message here.",
    template: `// Preprocessor Script
// Runs for every message after receipt, before the source filter/transformer.
// The 'message' variable contains the raw incoming message string.
// Return the (possibly modified) message string.

// Example: Strip leading/trailing whitespace
// message = message.trim();

return message;
`,
  },
  {
    key: "postprocessor_script" as const,
    label: "Postprocessor",
    desc: "Runs for every message AFTER all destinations complete. Access responseMap for destination responses.",
    template: `// Postprocessor Script
// Runs after all destinations have finished processing.
// Access responseMap to inspect destination responses.
// Access channelMap and sourceMap for message context.

// Example: Log completion
// var destResponse = responseMap.get('Destination 1');
// logger.info('Processing complete. Status: ' + destResponse.getStatus());

return;
`,
  },
];

// ── Component ─────────────────────────────────────────────────────────────
export default function ScriptsTab({ data, onChange }: ScriptsTabProps) {
  const [activeTab, setActiveTab] = useState<keyof ChannelScripts>("deploy_script");

  const activeScript = SCRIPT_TABS.find((t) => t.key === activeTab)!;
  const value = data[activeTab] || activeScript.template;

  return (
    <div className="max-w-5xl">
      {/* Script sub-tabs */}
      <div className="flex items-center gap-1 mb-4">
        {SCRIPT_TABS.map((t) => {
          const hasContent = (data[t.key] ?? "").trim().length > 0 && data[t.key] !== t.template;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "border-[var(--hb-teal)]/50 bg-[var(--hb-teal)]/8 text-[var(--hb-teal)]"
                  : "border-[var(--hb-border-subtle)] bg-[var(--hb-surface)]/60 text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-secondary)]"
              }`}
            >
              {t.label}
              {hasContent && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hb-amber)]" title="Has custom script" />
              )}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <div className="rounded-t-xl border border-b-0 border-[var(--hb-border)] bg-[var(--hb-surface)] px-5 py-3">
        <p className="text-xs text-[var(--hb-text-tertiary)]">{activeScript.desc}</p>
      </div>

      {/* Monaco Editor */}
      <div className="rounded-b-xl border border-[var(--hb-border)] bg-[var(--hb-deep)] overflow-hidden" style={{ height: 480 }}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={value}
          onChange={(v) => onChange({ ...data, [activeTab]: v ?? "" })}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            tabSize: 2,
            automaticLayout: true,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
            fontLigatures: true,
            renderLineHighlight: "gutter",
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>

      {/* Quick reference */}
      <div className="mt-4 rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)]/40 p-4">
        <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] mb-3">Quick Reference — Variable Maps</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "$c (channelMap)", desc: "Shared across source & all destinations for one message" },
            { name: "$co (connectorMap)", desc: "Local to the current connector" },
            { name: "$s (sourceMap)", desc: "Set by source, read-only downstream" },
            { name: "$r (responseMap)", desc: "Destination responses, used in postprocessor" },
          ].map((v) => (
            <div key={v.name} className="text-xs">
              <code className="text-[var(--hb-amber)] font-[family-name:var(--font-jetbrains)]">{v.name}</code>
              <p className="text-[var(--hb-text-ghost)] mt-0.5">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
