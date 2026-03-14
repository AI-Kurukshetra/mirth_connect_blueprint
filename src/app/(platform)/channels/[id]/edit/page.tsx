"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SummaryTab, { type ChannelSummary } from "@/components/channel-editor/SummaryTab";
import SourceTab, { type SourceConfig } from "@/components/channel-editor/SourceTab";
import DestinationsTab, { type Destination } from "@/components/channel-editor/DestinationsTab";
import ScriptsTab, { type ChannelScripts } from "@/components/channel-editor/ScriptsTab";

// ── Tab configuration ─────────────────────────────────────────────────────
const TABS = [
  { key: "summary", label: "Summary", shortcut: "1" },
  { key: "source", label: "Source", shortcut: "2" },
  { key: "destinations", label: "Destinations", shortcut: "3" },
  { key: "scripts", label: "Scripts", shortcut: "4" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Component ─────────────────────────────────────────────────────────────
export default function ChannelEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [channelStatus, setChannelStatus] = useState<string>("stopped");

  // ── Channel state ───────────────────────────────────────────────────
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

  // ── Load channel data ───────────────────────────────────────────────
  const loadChannel = useCallback(async () => {
    setLoading(true);
    const { data: channel, error: chErr } = await supabase
      .from("channels")
      .select("*")
      .eq("id", id)
      .single();

    if (chErr || !channel) {
      setError("Channel not found");
      setLoading(false);
      return;
    }

    setSummary({
      name: channel.name ?? "",
      description: channel.description ?? "",
      inbound_data_type: channel.inbound_data_type ?? "hl7v2",
      outbound_data_type: channel.outbound_data_type ?? "hl7v2",
      initial_state: channel.initial_state ?? "stopped",
      message_storage_mode: channel.message_storage_mode ?? "development",
      content_encryption: channel.content_encryption ?? false,
      prune_content_days: channel.prune_content_days,
      prune_metadata_days: channel.prune_metadata_days,
      tags: channel.tags ?? [],
    });

    setSource({
      source_connector_type: channel.source_connector_type ?? "tcp_listener",
      source_connector_properties: channel.source_connector_properties ?? {},
      source_queue_enabled: channel.source_queue_enabled ?? false,
      source_response: channel.source_response ?? "auto",
      source_filter: channel.source_filter ?? [],
      source_transformer: channel.source_transformer ?? [],
    });

    setScripts({
      deploy_script: channel.deploy_script ?? "",
      undeploy_script: channel.undeploy_script ?? "",
      preprocessor_script: channel.preprocessor_script ?? "",
      postprocessor_script: channel.postprocessor_script ?? "",
    });

    setChannelStatus(channel.status ?? "stopped");

    // Load destinations
    const { data: dests } = await supabase
      .from("destinations")
      .select("*")
      .eq("channel_id", id)
      .order("sort_order", { ascending: true });

    if (dests && dests.length > 0) {
      setDestinations(dests);
    }

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    loadChannel();
  }, [loadChannel]);

  // ── Save channel ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Update channel
      const { error: chErr } = await supabase
        .from("channels")
        .update({
          ...summary,
          ...source,
          ...scripts,
          updated_at: new Date().toISOString(),
          revision: undefined, // let DB handle
        })
        .eq("id", id);

      if (chErr) throw chErr;

      // Sync destinations — delete existing, re-insert
      await supabase.from("destinations").delete().eq("channel_id", id);

      if (destinations.length > 0) {
        const { error: dErr } = await supabase.from("destinations").insert(
          destinations.map((d, i) => ({
            ...d,
            id: d.id || undefined,
            channel_id: id,
            sort_order: i,
          }))
        );
        if (dErr) throw dErr;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Channel actions ─────────────────────────────────────────────────
  const toggleStatus = async () => {
    const next = channelStatus === "started" ? "stopped" : "started";
    await supabase.from("channels").update({ status: next, deployed: next === "started" }).eq("id", id);
    setChannelStatus(next);
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[var(--hb-teal)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    started: "bg-[var(--hb-green)]",
    stopped: "bg-[var(--hb-text-ghost)]",
    paused: "bg-[var(--hb-amber)]",
    error: "bg-[var(--hb-red)]",
  };

  return (
    <div className="-m-8 flex flex-col h-[calc(100vh-4rem)] hb-animate-in">
      {/* ── Top toolbar ──────────────────────────────────────────────── */}
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
              <span className={`w-2.5 h-2.5 rounded-full hb-status-pulse ${statusColor[channelStatus] ?? "bg-[var(--hb-text-ghost)]"}`} />
              <h1 className="text-lg font-semibold text-[var(--hb-text-primary)]">{summary.name || "Untitled Channel"}</h1>
              <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-tertiary)] bg-[var(--hb-elevated)] px-2 py-0.5 rounded truncate max-w-[6rem]">{id.slice(0, 8)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleStatus}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                channelStatus === "started"
                  ? "border-[var(--hb-red)]/40 text-[var(--hb-red)] hover:bg-[var(--hb-red)]/10"
                  : "border-[var(--hb-teal)]/40 text-[var(--hb-teal)] hover:bg-[var(--hb-teal)]/10"
              }`}
            >
              {channelStatus === "started" ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  Stop
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Start
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                saved
                  ? "bg-[var(--hb-green)] text-white"
                  : "hb-btn-primary text-white"
              } disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/></svg>
                  Saving…
                </>
              ) : saved ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  Saved
                </>
              ) : (
                "Save Changes"
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

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
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

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "summary" && <SummaryTab data={summary} onChange={setSummary} />}
        {activeTab === "source" && <SourceTab data={source} onChange={setSource} />}
        {activeTab === "destinations" && <DestinationsTab destinations={destinations} onChange={setDestinations} />}
        {activeTab === "scripts" && <ScriptsTab data={scripts} onChange={setScripts} />}
      </div>
    </div>
  );
}
