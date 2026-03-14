"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface QueueEntry {
  id: string;
  message_id: string;
  channel_id: string;
  destination_id: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  error_log: Record<string, unknown>[] | null;
  created_at: string;
  completed_at: string | null;
}

interface ChannelRef {
  id: string;
  name: string;
}

type TabKey = "pending" | "failed" | "completed";

export default function QueuePage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [channels, setChannels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [counts, setCounts] = useState({ pending: 0, failed: 0, completed: 0 });

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch channel names for display
    const { data: chData } = await supabase.from("channels").select("id, name");
    if (chData) {
      const map: Record<string, string> = {};
      (chData as ChannelRef[]).forEach((c) => (map[c.id] = c.name));
      setChannels(map);
    }

    // Fetch entries for current tab
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("status", activeTab)
      .order("created_at", { ascending: false })
      .limit(100);

    setEntries((data as QueueEntry[]) ?? []);

    // Fetch counts
    const statuses: TabKey[] = ["pending", "failed", "completed"];
    const countResults: Record<string, number> = {};
    for (const s of statuses) {
      const { count } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("status", s);
      countResults[s] = count ?? 0;
    }
    setCounts({
      pending: countResults.pending,
      failed: countResults.failed,
      completed: countResults.completed,
    });

    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const retryEntry = async (entryId: string) => {
    const supabase = createClient();
    await supabase
      .from("queue_entries")
      .update({ status: "pending", next_retry_at: new Date().toISOString() })
      .eq("id", entryId);
    fetchQueue();
  };

  const retryAll = async () => {
    const supabase = createClient();
    await supabase
      .from("queue_entries")
      .update({ status: "pending", next_retry_at: new Date().toISOString() })
      .eq("status", "failed");
    fetchQueue();
  };

  const purgeCompleted = async () => {
    const supabase = createClient();
    await supabase.from("queue_entries").delete().eq("status", "completed");
    fetchQueue();
  };

  const tabs: { key: TabKey; label: string; color: string; dotColor: string }[] = [
    { key: "pending", label: "Pending", color: "text-[var(--hb-amber)]", dotColor: "bg-[var(--hb-amber)]" },
    { key: "failed", label: "Failed", color: "text-[var(--hb-red)]", dotColor: "bg-[var(--hb-red)]" },
    { key: "completed", label: "Completed", color: "text-[var(--hb-green)]", dotColor: "bg-[var(--hb-green)]" },
  ];

  return (
    <div className="hb-animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hb-text-primary)]">Queue Management</h1>
          <p className="text-[var(--hb-text-tertiary)] text-sm mt-1">Monitor and manage message processing queue</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "failed" && counts.failed > 0 && (
            <button
              onClick={retryAll}
              className="hb-btn-ghost inline-flex items-center gap-1.5 rounded-lg border border-[var(--hb-amber)]/30 px-3 py-1.5 text-xs font-medium text-[var(--hb-amber)] hover:bg-[var(--hb-amber)]/10 transition-colors"
            >
              Retry All Failed
            </button>
          )}
          {activeTab === "completed" && counts.completed > 0 && (
            <button
              onClick={purgeCompleted}
              className="hb-btn-ghost inline-flex items-center gap-1.5 rounded-lg border border-[var(--hb-border)] px-3 py-1.5 text-xs font-medium text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-elevated)] transition-colors"
            >
              Purge Completed
            </button>
          )}
          <button
            onClick={fetchQueue}
            className="hb-btn-ghost inline-flex items-center gap-1.5 rounded-lg border border-[var(--hb-border)] bg-[var(--hb-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--hb-text-secondary)] hover:bg-[var(--hb-deep)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl border p-5 text-left transition-all hb-stagger-${index + 1} ${
              activeTab === tab.key
                ? "border-[var(--hb-teal)]/40 bg-[var(--hb-teal)]/5"
                : "border-[var(--hb-border)] bg-[var(--hb-surface)] hover:border-[var(--hb-border)]"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${tab.dotColor}`} />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">{tab.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--hb-text-primary)] font-[family-name:var(--font-jetbrains)]">{counts[tab.key]}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden hb-stagger-4">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_200px_100px_100px_120px_80px] gap-0 px-5 py-2.5 border-b border-[var(--hb-border)] bg-[var(--hb-deep)]">
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">Message / Channel</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">Created</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-center">Attempts</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-center">Max</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">Next Retry</div>
          <div />
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[var(--hb-text-ghost)] border-t-[var(--hb-teal)] rounded-full animate-spin" />
            <p className="text-[var(--hb-text-tertiary)] mt-3 text-sm">Loading queue entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-[var(--hb-text-ghost)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            <h3 className="text-lg font-medium text-[var(--hb-text-secondary)] mb-2">No {activeTab} entries</h3>
            <p className="text-[var(--hb-text-ghost)]">
              {activeTab === "pending" && "The queue is clear. All messages have been processed."}
              {activeTab === "failed" && "No failed messages. Your integrations are running smoothly."}
              {activeTab === "completed" && "No completed entries found."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--hb-border)]/60">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[1fr_200px_100px_100px_120px_80px] gap-0 px-5 py-3 hover:bg-[var(--hb-elevated)]/30 transition-colors items-center"
              >
                <div className="min-w-0">
                  <div className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)] truncate">{entry.message_id.slice(0, 8)}</div>
                  <div className="text-xs text-[var(--hb-text-tertiary)] truncate">{channels[entry.channel_id] ?? entry.channel_id.slice(0, 8)}</div>
                  {entry.error_log && entry.error_log.length > 0 && (
                    <div className="text-[10px] text-[var(--hb-red)]/70 truncate mt-0.5 font-[family-name:var(--font-jetbrains)]">
                      {String((entry.error_log[entry.error_log.length - 1] as Record<string, unknown>)?.message ?? "Error")}
                    </div>
                  )}
                </div>
                <div className="text-xs text-[var(--hb-text-tertiary)] font-[family-name:var(--font-jetbrains)]">
                  {new Date(entry.created_at).toLocaleString()}
                </div>
                <div className="text-center">
                  <span className={`text-sm font-[family-name:var(--font-jetbrains)] ${entry.attempts >= entry.max_attempts ? "text-[var(--hb-red)]" : "text-[var(--hb-text-secondary)]"}`}>
                    {entry.attempts}
                  </span>
                </div>
                <div className="text-center text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-tertiary)]">
                  {entry.max_attempts}
                </div>
                <div className="text-xs text-[var(--hb-text-tertiary)] font-[family-name:var(--font-jetbrains)]">
                  {entry.next_retry_at ? new Date(entry.next_retry_at).toLocaleTimeString() : "—"}
                </div>
                <div className="text-right">
                  {activeTab === "failed" && (
                    <button
                      onClick={() => retryEntry(entry.id)}
                      className="text-xs text-[var(--hb-teal)] hover:text-[var(--hb-teal)]/80 transition-colors font-[family-name:var(--font-jetbrains)]"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
