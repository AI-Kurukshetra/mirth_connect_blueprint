"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SummaryTab, { type ChannelSummary } from "@/components/channel-editor/SummaryTab";
import SourceTab, { type SourceConfig } from "@/components/channel-editor/SourceTab";
import DestinationsTab, { type Destination } from "@/components/channel-editor/DestinationsTab";
import ScriptsTab, { type ChannelScripts } from "@/components/channel-editor/ScriptsTab";

const TABS = [
  { key: "summary", label: "Summary", shortcut: "1" },
  { key: "source", label: "Source", shortcut: "2" },
  { key: "destinations", label: "Destinations", shortcut: "3" },
  { key: "scripts", label: "Scripts", shortcut: "4" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function NewChannelPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<ChannelSummary>({
    name: "",
    description: "",
    inbound_data_type: "hl7v2",
    outbound_data_type: "hl7v2",
    initial_state: "stopped",
    message_storage_mode: "development",
    content_encryption: false,
    prune_content_days: null,
    prune_metadata_days: null,
    tags: [],
  });

  const [source, setSource] = useState<SourceConfig>({
    source_connector_type: "tcp_listener",
    source_connector_properties: {},
    source_queue_enabled: false,
    source_response: "auto",
    source_filter: [],
    source_transformer: [],
  });

  const [destinations, setDestinations] = useState<Destination[]>([
    {
      name: "Destination 1",
      sort_order: 0,
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
    },
  ]);

  const [scripts, setScripts] = useState<ChannelScripts>({
    deploy_script: "",
    undeploy_script: "",
    preprocessor_script: "",
    postprocessor_script: "",
  });

  const handleCreate = async () => {
    if (!summary.name.trim()) {
      setError("Channel name is required");
      setActiveTab("summary");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: channel, error: chErr } = await supabase
        .from("channels")
        .insert({
          ...summary,
          ...source,
          ...scripts,
          status: "stopped",
          deployed: false,
          enabled: true,
        })
        .select("id")
        .single();

      if (chErr) throw chErr;

      // Insert destinations
      if (destinations.length > 0) {
        const { error: dErr } = await supabase.from("destinations").insert(
          destinations.map((d, i) => ({
            ...d,
            channel_id: channel.id,
            sort_order: i,
          }))
        );
        if (dErr) throw dErr;
      }

      router.push("/channels");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
      setSaving(false);
    }
  };

  return (
    <div className="-m-8 flex flex-col h-[calc(100vh-4rem)] hb-animate-in">
      {/* Top toolbar */}
      <div className="shrink-0 border-b border-[var(--hb-border)] bg-[var(--hb-deep)]/80 backdrop-blur-lg px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/channels")}
              className="flex items-center gap-1.5 text-sm text-[var(--hb-text-ghost)] hover:text-[var(--hb-teal)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Channels
            </button>
            <div className="w-px h-6 bg-[var(--hb-border)]" />
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--hb-text-ghost)] hb-status-pulse" />
              <h1 className="text-lg font-semibold text-[var(--hb-text-primary)]">
                {summary.name || "New Channel"}
              </h1>
              <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-tertiary)] bg-[var(--hb-elevated)] px-2 py-0.5 rounded">new</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/channels")}
              className="hb-btn-ghost rounded-lg border border-[var(--hb-border)] px-4 py-1.5 text-sm font-medium text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:border-[var(--hb-border-bright)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg hb-btn-primary px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/></svg>
                  Creating…
                </>
              ) : (
                "Create Channel"
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded-lg bg-[var(--hb-red)]/10 border border-[var(--hb-red)]/30 px-3 py-2 text-sm text-[var(--hb-red)]">
            {error}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="shrink-0 border-b border-[var(--hb-border)] bg-[var(--hb-obsidian)] px-6">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-[var(--hb-text-primary)]"
                  : "text-[var(--hb-text-ghost)] hover:text-[var(--hb-text-secondary)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <kbd className="hidden md:inline text-[10px] font-[family-name:var(--font-jetbrains)] bg-[var(--hb-elevated)] text-[var(--hb-text-tertiary)] px-1 py-0.5 rounded">{tab.shortcut}</kbd>
                {tab.label}
              </span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--hb-teal)] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "summary" && <SummaryTab data={summary} onChange={setSummary} />}
        {activeTab === "source" && <SourceTab data={source} onChange={setSource} />}
        {activeTab === "destinations" && <DestinationsTab destinations={destinations} onChange={setDestinations} />}
        {activeTab === "scripts" && <ScriptsTab data={scripts} onChange={setScripts} />}
      </div>
    </div>
  );
}
