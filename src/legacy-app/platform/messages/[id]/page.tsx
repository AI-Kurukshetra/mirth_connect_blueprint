"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface MessageDetail {
  id: string;
  channel_id: string;
  connector_name: string | null;
  status: string;
  raw_content: string | null;
  transformed_content: string | null;
  encoded_content: string | null;
  sent_content: string | null;
  response_content: string | null;
  error_content: string | null;
  connector_map: Record<string, unknown> | null;
  channel_map: Record<string, unknown> | null;
  response_map: Record<string, unknown> | null;
  message_type: string | null;
  data_type: string | null;
  direction: string | null;
  processing_time_ms: number | null;
  custom_metadata: Record<string, unknown> | null;
  created_at: string;
  channels?: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  received: "bg-[var(--hb-teal)]/15 text-[var(--hb-teal)] border-[var(--hb-teal)]/25",
  transformed: "bg-[var(--hb-cyan)]/15 text-[var(--hb-cyan)] border-[var(--hb-cyan)]/25",
  filtered: "bg-[var(--hb-text-tertiary)]/15 text-[var(--hb-text-secondary)] border-[var(--hb-text-tertiary)]/25",
  sent: "bg-[var(--hb-green)]/15 text-[var(--hb-green)] border-[var(--hb-green)]/25",
  queued: "bg-[var(--hb-amber)]/15 text-[var(--hb-amber)] border-[var(--hb-amber)]/25",
  error: "bg-[var(--hb-red)]/15 text-[var(--hb-red)] border-[var(--hb-red)]/25",
  pending: "bg-[var(--hb-text-ghost)]/15 text-[var(--hb-text-tertiary)] border-[var(--hb-text-ghost)]/25",
};

const TABS = [
  { key: "raw", label: "Raw" },
  { key: "transformed", label: "Transformed" },
  { key: "encoded", label: "Encoded" },
  { key: "sent", label: "Sent" },
  { key: "response", label: "Response" },
  { key: "mappings", label: "Mappings" },
  { key: "errors", label: "Errors" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function detectLanguage(content: string | null, dataType: string | null): string {
  if (!content) return "text";
  const trimmed = content.trim();
  if (dataType?.toLowerCase() === "json" || trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (dataType?.toLowerCase() === "xml" || trimmed.startsWith("<")) return "xml";
  if (trimmed.startsWith("MSH|") || dataType?.toLowerCase() === "hl7v2") return "text";
  return "text";
}

function JsonTree({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  const [expanded, setExpanded] = useState(true);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-sm text-[var(--hb-text-tertiary)] italic">No {label} data available</div>
    );
  }

  return (
    <div className="border border-[var(--hb-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-[var(--hb-deep)]/50 text-left hover:bg-[var(--hb-deep)] transition-colors"
      >
        <svg
          className={`w-4 h-4 text-[var(--hb-text-tertiary)] transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-sm font-medium text-[var(--hb-text-secondary)]">{label}</span>
        <span className="text-xs text-[var(--hb-text-tertiary)] ml-auto font-[family-name:var(--font-jetbrains)]">{Object.keys(data).length} entries</span>
      </button>
      {expanded && (
        <div className="p-4 bg-[var(--hb-obsidian)]">
          <pre className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)] whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("raw");
  const [copied, setCopied] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const fetchMessage = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*, channels(name)")
      .eq("id", id)
      .single();

    if (!error && data) {
      setMessage(data as unknown as MessageDetail);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchMessage();
  }, [fetchMessage]);

  async function handleReprocess() {
    if (!message) return;
    setReprocessing(true);
    const supabase = createClient();
    await supabase.from("messages").update({ status: "QUEUED" }).eq("id", message.id);
    await fetchMessage();
    setReprocessing(false);
  }

  function handleCopyRaw() {
    if (message?.raw_content) {
      navigator.clipboard.writeText(message.raw_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleExport() {
    if (!message) return;
    const blob = new Blob([JSON.stringify(message, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-${message.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getTabContent(): string | null {
    if (!message) return null;
    switch (activeTab) {
      case "raw": return message.raw_content;
      case "transformed": return message.transformed_content;
      case "encoded": return message.encoded_content;
      case "sent": return message.sent_content;
      case "response": return message.response_content;
      default: return null;
    }
  }

  const channelName = message?.channels && typeof message.channels === "object" && "name" in message.channels
    ? (message.channels as { name: string }).name
    : "Unknown";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[var(--hb-border)] border-t-[var(--hb-teal)] rounded-full animate-spin" />
          <p className="text-[var(--hb-text-tertiary)] mt-4 text-sm">Loading message...</p>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-14 h-14 text-[var(--hb-text-ghost)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h3 className="text-lg font-medium text-[var(--hb-text-secondary)] mb-2">Message not found</h3>
          <button onClick={() => router.push("/messages")} className="text-sm text-[var(--hb-teal)] hover:text-[var(--hb-cyan)]">
            &larr; Back to Message Browser
          </button>
        </div>
      </div>
    );
  }

  const tabContent = getTabContent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between hb-animate-in">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/messages")}
            className="p-2 text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-deep)] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--hb-text-primary)]">Message Detail</h1>
            <p className="text-[var(--hb-text-tertiary)] text-sm font-[family-name:var(--font-jetbrains)] mt-0.5">{message.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyRaw}
            className="hb-btn-ghost"
          >
            {copied ? "Copied!" : "Copy Raw"}
          </button>
          <button
            onClick={handleExport}
            className="hb-btn-ghost"
          >
            <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
            </svg>
            Export
          </button>
          <button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="hb-btn-primary disabled:opacity-50"
          >
            {reprocessing ? "Reprocessing..." : "Reprocess"}
          </button>
        </div>
      </div>

      {/* Metadata Panel */}
      <div className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-5 hb-animate-in">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Status</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[message.status?.toLowerCase()] ?? "bg-[var(--hb-text-tertiary)]/15 text-[var(--hb-text-secondary)] border-[var(--hb-text-tertiary)]/25"}`}>
              {message.status}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Channel</span>
            <span className="text-sm text-[var(--hb-text-secondary)]">{channelName}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Direction</span>
            {message.direction ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${message.direction === "IN" || message.direction === "INBOUND" ? "bg-[var(--hb-teal)]/15 text-[var(--hb-teal)]" : "bg-purple-500/15 text-purple-400"}`}>
                {message.direction}
              </span>
            ) : (
              <span className="text-sm text-[var(--hb-text-ghost)]">--</span>
            )}
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Message Type</span>
            <span className="text-sm text-[var(--hb-text-secondary)]">{message.message_type ?? "--"}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Data Type</span>
            <span className="text-sm text-[var(--hb-text-secondary)]">{message.data_type ?? "--"}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Processing</span>
            <span className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">
              {message.processing_time_ms != null ? `${message.processing_time_ms}ms` : "--"}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Timestamp</span>
            <span className="text-sm text-[var(--hb-text-secondary)]">{new Date(message.created_at).toLocaleString()}</span>
          </div>
        </div>
        {message.connector_name && (
          <div className="mt-4 pt-4 border-t border-[var(--hb-border)]">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">Connector: </span>
            <span className="text-sm text-[var(--hb-text-secondary)]">{message.connector_name}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden hb-animate-in">
        <div className="flex border-b border-[var(--hb-border)] overflow-x-auto">
          {TABS.map((tab) => {
            const hasContent =
              tab.key === "mappings"
                ? !!(message.connector_map || message.channel_map || message.response_map)
                : tab.key === "errors"
                  ? !!message.error_content
                  : !!message[`${tab.key}_content` as keyof MessageDetail];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "text-[var(--hb-teal)] bg-[var(--hb-deep)]/50"
                    : hasContent
                      ? "text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-deep)]/30"
                      : "text-[var(--hb-text-ghost)] hover:text-[var(--hb-text-tertiary)] hover:bg-[var(--hb-deep)]/20"
                }`}
              >
                {tab.label}
                {tab.key === "errors" && message.error_content && (
                  <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-[var(--hb-red)]" />
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--hb-teal)]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="min-h-[400px]">
          {activeTab === "mappings" ? (
            <div className="p-5 space-y-4">
              <JsonTree data={message.channel_map} label="channelMap" />
              <JsonTree data={message.connector_map} label="connectorMap" />
              <JsonTree data={message.response_map} label="responseMap" />
              {message.custom_metadata && Object.keys(message.custom_metadata).length > 0 && (
                <JsonTree data={message.custom_metadata} label="customMetadata" />
              )}
            </div>
          ) : activeTab === "errors" ? (
            <div className="p-5">
              {message.error_content ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-[var(--hb-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                    <span className="text-sm font-semibold text-[var(--hb-red)]">Error Details</span>
                  </div>
                  <pre className="bg-[var(--hb-red)]/10 border border-[var(--hb-red)]/20 rounded-lg p-4 text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-red)] whitespace-pre-wrap overflow-x-auto leading-relaxed">
                    {message.error_content}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <svg className="w-10 h-10 text-[var(--hb-text-ghost)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-[var(--hb-text-tertiary)]">No errors recorded for this message</p>
                  </div>
                </div>
              )}
            </div>
          ) : tabContent ? (
            <MonacoEditor
              height="400px"
              language={detectLanguage(tabContent, message.data_type)}
              value={tabContent}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: "on",
                wordWrap: "on",
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-10 h-10 text-[var(--hb-text-ghost)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm text-[var(--hb-text-tertiary)]">No {activeTab} content available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
