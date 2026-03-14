"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SOURCE_CONNECTORS } from "@/components/channel-editor/ConnectorForm";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  status: string;
  deployed: boolean;
  enabled: boolean;
  source_connector_type: string;
  inbound_data_type: string;
  outbound_data_type: string;
  revision: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_deployed_at: string | null;
}

interface ChannelStats {
  channel_id: string;
  received: number;
  filtered: number;
  queued: number;
  sent: number;
  errored: number;
}

const STATUS_CONFIG: Record<string, { dot: string; label: string; text: string; pulse: boolean }> = {
  started: { dot: "bg-[var(--hb-green)]", label: "Started", text: "text-[var(--hb-green)]", pulse: true },
  stopped: { dot: "bg-[var(--hb-text-ghost)]", label: "Stopped", text: "text-[var(--hb-text-tertiary)]", pulse: false },
  paused: { dot: "bg-[var(--hb-amber)]", label: "Paused", text: "text-[var(--hb-amber)]", pulse: false },
  error: { dot: "bg-[var(--hb-red)]", label: "Error", text: "text-[var(--hb-red)]", pulse: false },
};

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [stats, setStats] = useState<Record<string, ChannelStats>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchChannels = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("channels")
      .select("*")
      .order("created_at", { ascending: false });

    setChannels((data as Channel[]) ?? []);

    // Fetch stats
    const { data: statsData } = await supabase
      .from("channel_stats")
      .select("*");

    if (statsData) {
      const map: Record<string, ChannelStats> = {};
      for (const s of statsData) {
        if (!map[s.channel_id]) {
          map[s.channel_id] = { channel_id: s.channel_id, received: 0, filtered: 0, queued: 0, sent: 0, errored: 0 };
        }
        map[s.channel_id].received += s.received ?? 0;
        map[s.channel_id].filtered += s.filtered ?? 0;
        map[s.channel_id].queued += s.queued ?? 0;
        map[s.channel_id].sent += s.sent ?? 0;
        map[s.channel_id].errored += s.errored ?? 0;
      }
      setStats(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === channels.length) setSelected(new Set());
    else setSelected(new Set(channels.map((c) => c.id)));
  };

  const bulkAction = async (action: "start" | "stop" | "deploy") => {
    const supabase = createClient();
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const updates: Record<string, unknown> =
      action === "start"
        ? { status: "started", deployed: true }
        : action === "stop"
          ? { status: "stopped" }
          : { deployed: true, last_deployed_at: new Date().toISOString() };

    for (const cid of ids) {
      await supabase.from("channels").update(updates).eq("id", cid);
    }
    await fetchChannels();
    setSelected(new Set());
  };

  const connectorLabel = (type: string) =>
    SOURCE_CONNECTORS.find((c) => c.value === type)?.label ?? type;

  return (
    <div className="hb-animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="hb-stagger-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--hb-text-primary)] tracking-tight">
              Channels
            </h1>
            <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[var(--hb-text-ghost)] bg-[var(--hb-elevated)] border border-[var(--hb-border)] rounded-md px-2 py-0.5">
              {channels.length}
            </span>
          </div>
          <p className="text-[var(--hb-text-tertiary)] text-sm mt-1.5 tracking-wide">
            Integration channel management and monitoring
          </p>
        </div>

        <div className="flex items-center gap-2 hb-stagger-2">
          {selected.size > 0 && (
            <>
              <button
                onClick={() => bulkAction("deploy")}
                className="hb-btn-ghost inline-flex items-center gap-1.5 text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                Deploy ({selected.size})
              </button>
              <button
                onClick={() => bulkAction("start")}
                className="hb-btn-ghost inline-flex items-center gap-1.5 text-xs !text-[var(--hb-green)] !border-[var(--hb-green)]/20 hover:!bg-[var(--hb-green)]/5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Start ({selected.size})
              </button>
              <button
                onClick={() => bulkAction("stop")}
                className="hb-btn-ghost inline-flex items-center gap-1.5 text-xs !text-[var(--hb-red)] !border-[var(--hb-red)]/20 hover:!bg-[var(--hb-red)]/5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
                Stop ({selected.size})
              </button>
              <div className="w-px h-6 bg-[var(--hb-border)] mx-1" />
            </>
          )}
          <Link
            href="/channels/new"
            className="hb-btn-primary inline-flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Channel
          </Link>
        </div>
      </div>

      {/* Channel table */}
      {loading ? (
        <div className="hb-panel rounded-xl overflow-hidden hb-stagger-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 border-b border-[var(--hb-border-subtle)] hb-stagger-${Math.min(i + 2, 8)}`}
            >
              <div className="w-4 h-4 rounded hb-skeleton" />
              <div className="w-2.5 h-2.5 rounded-full hb-skeleton" />
              <div className="h-4 hb-skeleton rounded w-44" />
              <div className="flex-1" />
              <div className="h-3 hb-skeleton rounded w-20" />
              <div className="h-3 hb-skeleton rounded w-14" />
              <div className="h-3 hb-skeleton rounded w-14" />
              <div className="h-3 hb-skeleton rounded w-14" />
              <div className="h-3 hb-skeleton rounded w-14" />
              <div className="h-5 hb-skeleton rounded w-16" />
            </div>
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="hb-panel rounded-xl border-dashed !border-[var(--hb-border)] p-20 text-center hb-stagger-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--hb-elevated)] border border-[var(--hb-border)] mb-6">
            <svg className="w-8 h-8 text-[var(--hb-text-ghost)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[var(--hb-text-secondary)] mb-2">
            No channels configured
          </h3>
          <p className="text-[var(--hb-text-ghost)] text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Create your first integration channel to begin routing healthcare data through secure, monitored pipelines.
          </p>
          <Link
            href="/channels/new"
            className="hb-btn-primary inline-flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Channel
          </Link>
        </div>
      ) : (
        <div className="hb-panel rounded-xl overflow-hidden hb-stagger-3">
          {/* Table header */}
          <div className="grid grid-cols-[40px_32px_1fr_160px_72px_72px_72px_72px_72px_96px_96px] gap-0 px-5 py-3 border-b border-[var(--hb-border)] bg-[var(--hb-deep)]">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selected.size === channels.length && channels.length > 0}
                onChange={toggleAll}
                className="w-3.5 h-3.5 rounded border-[var(--hb-border-bright)] bg-[var(--hb-surface)] text-[var(--hb-teal)] focus:ring-1 focus:ring-[var(--hb-teal)]/30 focus:ring-offset-0 cursor-pointer accent-[var(--hb-teal)]"
              />
            </div>
            <div />
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">
              Name
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">
              Source
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">
              Recv
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">
              Filt
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">
              Queue
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">
              Sent
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">
              Error
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-center">
              Deploy
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">
              Modified
            </div>
          </div>

          {/* Table rows */}
          {channels.map((ch, idx) => {
            const s = stats[ch.id] ?? { received: 0, filtered: 0, queued: 0, sent: 0, errored: 0 };
            const st = STATUS_CONFIG[ch.status] ?? STATUS_CONFIG.stopped;

            return (
              <div
                key={ch.id}
                className={`group grid grid-cols-[40px_32px_1fr_160px_72px_72px_72px_72px_72px_96px_96px] gap-0 px-5 py-3 border-b border-[var(--hb-border-subtle)] hover:bg-[var(--hb-elevated)]/50 transition-all duration-200 cursor-pointer hb-stagger-${Math.min(idx + 4, 8)} ${
                  selected.has(ch.id) ? "bg-[var(--hb-teal)]/[0.03] border-l-2 border-l-[var(--hb-teal)]/30" : "border-l-2 border-l-transparent"
                }`}
                onClick={() => router.push(`/channels/${ch.id}/edit`)}
              >
                {/* Checkbox */}
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(ch.id)}
                    onChange={() => toggleSelect(ch.id)}
                    className="w-3.5 h-3.5 rounded border-[var(--hb-border-bright)] bg-[var(--hb-surface)] text-[var(--hb-teal)] focus:ring-1 focus:ring-[var(--hb-teal)]/30 focus:ring-offset-0 cursor-pointer accent-[var(--hb-teal)]"
                  />
                </div>

                {/* Status dot */}
                <div className="flex items-center">
                  <span
                    className={`w-2 h-2 rounded-full ${st.dot} ${st.pulse ? "hb-status-pulse" : ""}`}
                    title={st.label}
                  />
                </div>

                {/* Name + tags */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm font-semibold text-[var(--hb-text-primary)] truncate group-hover:text-[var(--hb-teal)] transition-colors duration-200">
                    {ch.name}
                  </span>
                  {ch.tags?.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="text-[9px] font-medium font-[family-name:var(--font-jetbrains)] uppercase tracking-wider bg-[var(--hb-elevated)] text-[var(--hb-text-ghost)] border border-[var(--hb-border-subtle)] px-1.5 py-0.5 rounded shrink-0"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Source type */}
                <div className="flex items-center">
                  <span className="text-xs text-[var(--hb-text-tertiary)] font-[family-name:var(--font-jetbrains)] truncate">
                    {connectorLabel(ch.source_connector_type)}
                  </span>
                </div>

                {/* Stats: Received */}
                <div className="flex items-center justify-end">
                  <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">
                    {s.received.toLocaleString()}
                  </span>
                </div>

                {/* Stats: Filtered */}
                <div className="flex items-center justify-end">
                  <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">
                    {s.filtered.toLocaleString()}
                  </span>
                </div>

                {/* Stats: Queued */}
                <div className="flex items-center justify-end">
                  <span className={`text-xs font-[family-name:var(--font-jetbrains)] ${s.queued > 0 ? "text-[var(--hb-amber)]" : "text-[var(--hb-text-ghost)]"}`}>
                    {s.queued.toLocaleString()}
                  </span>
                </div>

                {/* Stats: Sent */}
                <div className="flex items-center justify-end">
                  <span className="text-xs font-[family-name:var(--font-jetbrains)] text-[var(--hb-green)]/70">
                    {s.sent.toLocaleString()}
                  </span>
                </div>

                {/* Stats: Errored */}
                <div className="flex items-center justify-end">
                  <span className={`text-xs font-[family-name:var(--font-jetbrains)] ${s.errored > 0 ? "text-[var(--hb-red)]" : "text-[var(--hb-text-ghost)]"}`}>
                    {s.errored.toLocaleString()}
                  </span>
                </div>

                {/* Deployed */}
                <div className="flex items-center justify-center">
                  {ch.deployed ? (
                    <span className="hb-glow-teal text-[10px] font-semibold font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--hb-teal)] bg-[var(--hb-teal)]/[0.08] border border-[var(--hb-teal)]/20 rounded-full px-2.5 py-0.5">
                      Live
                    </span>
                  ) : (
                    <span className="text-[10px] font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--hb-text-ghost)]">
                      --
                    </span>
                  )}
                </div>

                {/* Modified */}
                <div className="flex items-center justify-end">
                  <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">
                    {new Date(ch.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
