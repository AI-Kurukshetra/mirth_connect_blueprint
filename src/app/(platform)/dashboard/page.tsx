"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────
interface Channel {
  id: string;
  name: string;
  status: string;
  deployed: boolean;
  source_connector_type: string;
  last_deployed_at: string | null;
  updated_at: string;
}

interface ChannelWithStats extends Channel {
  received: number;
  filtered: number;
  queued: number;
  sent: number;
  errored: number;
}

interface Message {
  id: string;
  channel_id: string;
  message_type: string;
  status: string;
  direction: string;
  data_type: string;
  processing_time_ms: number | null;
  created_at: string;
}

interface ServerLog {
  id: string;
  level: string;
  event_name: string;
  description: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  started: { dot: "bg-[var(--hb-green)]", text: "text-[var(--hb-green)]", bg: "bg-[var(--hb-green)]/10" },
  stopped: { dot: "bg-[var(--hb-text-ghost)]", text: "text-[var(--hb-text-tertiary)]", bg: "bg-[var(--hb-text-ghost)]/10" },
  paused: { dot: "bg-[var(--hb-amber)]", text: "text-[var(--hb-amber)]", bg: "bg-[var(--hb-amber)]/10" },
  error: { dot: "bg-[var(--hb-red)]", text: "text-[var(--hb-red)]", bg: "bg-[var(--hb-red)]/10" },
};

const MSG_STATUS_COLORS: Record<string, string> = {
  received: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  transformed: "text-[var(--hb-teal)] bg-[var(--hb-teal)]/10 border-[var(--hb-teal)]/20",
  filtered: "text-[var(--hb-text-tertiary)] bg-[var(--hb-text-ghost)]/10 border-[var(--hb-text-ghost)]/20",
  sent: "text-[var(--hb-green)] bg-[var(--hb-green)]/10 border-[var(--hb-green)]/20",
  queued: "text-[var(--hb-amber)] bg-[var(--hb-amber)]/10 border-[var(--hb-amber)]/20",
  error: "text-[var(--hb-red)] bg-[var(--hb-red)]/10 border-[var(--hb-red)]/20",
  pending: "text-[var(--hb-text-ghost)] bg-[var(--hb-text-ghost)]/10 border-[var(--hb-text-ghost)]/20",
};

// ── Component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelWithStats[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ messages: 0, active: 0, errors: 0, avgTime: 0 });

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Fetch channels
    const { data: chData } = await supabase
      .from("channels")
      .select("*")
      .order("name", { ascending: true });

    // Fetch stats
    const { data: statsData } = await supabase.from("channel_stats").select("*");

    // Merge stats into channels
    const statsMap: Record<string, { received: number; filtered: number; queued: number; sent: number; errored: number }> = {};
    if (statsData) {
      for (const s of statsData) {
        if (!statsMap[s.channel_id]) statsMap[s.channel_id] = { received: 0, filtered: 0, queued: 0, sent: 0, errored: 0 };
        statsMap[s.channel_id].received += s.received ?? 0;
        statsMap[s.channel_id].filtered += s.filtered ?? 0;
        statsMap[s.channel_id].queued += s.queued ?? 0;
        statsMap[s.channel_id].sent += s.sent ?? 0;
        statsMap[s.channel_id].errored += s.errored ?? 0;
      }
    }

    const merged: ChannelWithStats[] = (chData ?? []).map((ch: Channel) => ({
      ...ch,
      ...(statsMap[ch.id] ?? { received: 0, filtered: 0, queued: 0, sent: 0, errored: 0 }),
    }));
    setChannels(merged);

    // Fetch recent messages
    const { data: msgData } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    setMessages((msgData as Message[]) ?? []);

    // Fetch server events/logs
    const { data: logData } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs((logData as ServerLog[]) ?? []);

    // Calculate totals
    const totalMsgs = merged.reduce((a, c) => a + c.received + c.sent, 0);
    const activeCh = merged.filter((c) => c.status === "started").length;
    const totalErrors = merged.reduce((a, c) => a + c.errored, 0);
    const avgTime = msgData?.length
      ? Math.round(msgData.filter((m: Message) => m.processing_time_ms).reduce((a: number, m: Message) => a + (m.processing_time_ms ?? 0), 0) / Math.max(msgData.filter((m: Message) => m.processing_time_ms).length, 1))
      : 0;
    setTotals({ messages: totalMsgs, active: activeCh, errors: totalErrors, avgTime });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Channel actions
  const channelAction = async (id: string, action: "start" | "stop" | "pause") => {
    const supabase = createClient();
    const status = action === "start" ? "started" : action === "stop" ? "stopped" : "paused";
    await supabase.from("channels").update({ status, deployed: action === "start" }).eq("id", id);

    // Log event
    await supabase.from("events").insert({
      level: "INFO",
      event_name: `channel.${action}`,
      description: `Channel ${action}ed`,
      attributes: { channel_id: id },
    });

    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[var(--hb-teal)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="hb-animate-in hb-stagger-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--hb-text-primary)] tracking-tight">Dashboard</h1>
          <p className="text-[var(--hb-text-tertiary)] text-sm mt-1">Real-time integration engine monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--hb-teal)] opacity-40"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--hb-teal)]"></span>
            </span>
            <span className="text-[10px] font-[family-name:var(--font-jetbrains)] uppercase tracking-[0.15em] text-[var(--hb-text-ghost)]">Live &middot; 10s</span>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hb-border)] bg-[var(--hb-surface)] px-3 py-1.5 text-xs font-medium text-[var(--hb-text-secondary)] hover:bg-[var(--hb-elevated)] hover:border-[var(--hb-border-bright)] hover:text-[var(--hb-text-primary)] transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────── */}
      <div className="hb-animate-in hb-stagger-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Messages */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--hb-border)] bg-gradient-to-br from-[var(--hb-surface)] to-[var(--hb-elevated)] p-5 group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--hb-teal)]/[0.03] to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-lg bg-[var(--hb-teal)]/10 border border-[var(--hb-teal)]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--hb-teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-bold font-[family-name:var(--font-jetbrains)] text-[var(--hb-teal)] tracking-tight hb-glow-teal">
              {totals.messages.toLocaleString()}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] mt-1.5">Total Messages</p>
          </div>
        </div>

        {/* Active Channels */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--hb-border)] bg-gradient-to-br from-[var(--hb-surface)] to-[var(--hb-elevated)] p-5 group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--hb-green)]/[0.03] to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-lg bg-[var(--hb-green)]/10 border border-[var(--hb-green)]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--hb-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-bold font-[family-name:var(--font-jetbrains)] text-[var(--hb-green)] tracking-tight">
              {totals.active}<span className="text-base text-[var(--hb-text-ghost)] font-normal"> / {channels.length}</span>
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] mt-1.5">Active Channels</p>
          </div>
        </div>

        {/* Errors */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--hb-border)] bg-gradient-to-br from-[var(--hb-surface)] to-[var(--hb-elevated)] p-5 group">
          <div className={`absolute inset-0 bg-gradient-to-br ${totals.errors > 0 ? "from-[var(--hb-red)]/[0.04]" : "from-transparent"} to-transparent pointer-events-none`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${totals.errors > 0 ? "bg-[var(--hb-red)]/10 border border-[var(--hb-red)]/20" : "bg-[var(--hb-text-ghost)]/10 border border-[var(--hb-text-ghost)]/20"}`}>
                <svg className={`w-4 h-4 ${totals.errors > 0 ? "text-[var(--hb-red)]" : "text-[var(--hb-text-ghost)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </span>
            </div>
            <p className={`text-2xl font-bold font-[family-name:var(--font-jetbrains)] tracking-tight ${totals.errors > 0 ? "text-[var(--hb-red)]" : "text-[var(--hb-text-ghost)]"}`}>
              {totals.errors.toLocaleString()}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] mt-1.5">Errors</p>
          </div>
        </div>

        {/* Avg Processing */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--hb-border)] bg-gradient-to-br from-[var(--hb-surface)] to-[var(--hb-elevated)] p-5 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-bold font-[family-name:var(--font-jetbrains)] text-purple-400 tracking-tight">
              {totals.avgTime ? <>{totals.avgTime}<span className="text-sm text-purple-400/60 font-normal">ms</span></> : <span className="text-[var(--hb-text-ghost)]">&mdash;</span>}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] mt-1.5">Avg Processing</p>
          </div>
        </div>
      </div>

      {/* ── Channel Status Table ───────────────────────────────── */}
      <div className="hb-animate-in hb-stagger-3 rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--hb-border)] flex items-center justify-between bg-[var(--hb-elevated)]/50">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 rounded-full bg-[var(--hb-teal)]" />
            <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">Channel Status</h2>
          </div>
          <Link href="/channels" className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-teal-dim)] hover:text-[var(--hb-teal)] transition-colors duration-200">
            Manage Channels
          </Link>
        </div>

        {channels.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-[var(--hb-text-ghost)] text-sm">No channels configured.</p>
            <Link href="/channels/new" className="text-[var(--hb-teal-dim)] text-sm hover:text-[var(--hb-teal)] mt-2 inline-block transition-colors">
              Create your first channel
            </Link>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[32px_1fr_90px_68px_68px_68px_68px_68px_110px_80px] gap-0 px-5 py-2.5 bg-[var(--hb-deep)] border-b border-[var(--hb-border)]">
              <div />
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">Channel</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">Status</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">Recv</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">Filt</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">Queue</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">Sent</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-right">Err</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-center">Deployed</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] text-center">Actions</div>
            </div>

            {/* Table Rows */}
            {channels.map((ch) => {
              const st = STATUS_CONFIG[ch.status] ?? STATUS_CONFIG.stopped;
              return (
                <div
                  key={ch.id}
                  className="grid grid-cols-[32px_1fr_90px_68px_68px_68px_68px_68px_110px_80px] gap-0 px-5 py-2.5 border-b border-[var(--hb-border-subtle)] hover:bg-[var(--hb-elevated)]/40 transition-colors duration-150 group"
                >
                  {/* Status dot */}
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full ${st.dot} ${ch.status === "started" ? "hb-status-pulse" : ""}`} />
                  </div>

                  {/* Channel name + source type */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href={`/channels/${ch.id}/edit`} className="text-sm font-medium text-[var(--hb-text-primary)] hover:text-[var(--hb-teal)] transition-colors duration-150 truncate">
                      {ch.name}
                    </Link>
                    <span className="text-[10px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] shrink-0 hidden sm:inline">
                      {ch.source_connector_type}
                    </span>
                  </div>

                  {/* Status label */}
                  <div className="flex items-center">
                    <span className={`text-[11px] font-medium font-[family-name:var(--font-jetbrains)] ${st.text}`}>
                      {ch.status.charAt(0).toUpperCase() + ch.status.slice(1)}
                    </span>
                  </div>

                  {/* Stat columns */}
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">{ch.received}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">{ch.filtered}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className={`text-sm font-[family-name:var(--font-jetbrains)] ${ch.queued > 0 ? "text-[var(--hb-amber)]" : "text-[var(--hb-text-ghost)]"}`}>{ch.queued}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-green)]/80">{ch.sent}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className={`text-sm font-[family-name:var(--font-jetbrains)] ${ch.errored > 0 ? "text-[var(--hb-red)]" : "text-[var(--hb-text-ghost)]"}`}>{ch.errored}</span>
                  </div>

                  {/* Last Deployed */}
                  <div className="flex items-center justify-center">
                    <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)]">
                      {ch.last_deployed_at
                        ? new Date(ch.last_deployed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "\u2014"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-0.5">
                    {ch.status !== "started" ? (
                      <button
                        onClick={() => channelAction(ch.id, "start")}
                        className="p-1.5 rounded-md text-[var(--hb-green)]/50 hover:text-[var(--hb-green)] hover:bg-[var(--hb-green)]/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
                        title="Start"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => channelAction(ch.id, "pause")}
                          className="p-1.5 rounded-md text-[var(--hb-amber)]/50 hover:text-[var(--hb-amber)] hover:bg-[var(--hb-amber)]/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
                          title="Pause"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                        </button>
                        <button
                          onClick={() => channelAction(ch.id, "stop")}
                          className="p-1.5 rounded-md text-[var(--hb-red)]/50 hover:text-[var(--hb-red)] hover:bg-[var(--hb-red)]/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
                          title="Stop"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => router.push(`/channels/${ch.id}/edit`)}
                      className="p-1.5 rounded-md text-[var(--hb-text-ghost)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-elevated)] transition-all duration-150 opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── Bottom Split: Messages + Server Log ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Recent Messages ──────────────────────────────────── */}
        <div className="hb-animate-in hb-stagger-5 lg:col-span-2 rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--hb-border)] flex items-center justify-between bg-[var(--hb-elevated)]/50">
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 rounded-full bg-blue-400" />
              <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">Recent Messages</h2>
            </div>
            <Link href="/messages" className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-teal-dim)] hover:text-[var(--hb-teal)] transition-colors duration-200">
              View all
            </Link>
          </div>
          {messages.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-[var(--hb-text-ghost)]">No messages yet</div>
          ) : (
            <div className="divide-y divide-[var(--hb-border-subtle)]">
              {messages.slice(0, 8).map((msg) => (
                <div key={msg.id} className="px-5 py-2.5 flex items-center gap-4 hover:bg-[var(--hb-elevated)]/30 transition-colors duration-150">
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-[family-name:var(--font-jetbrains)] uppercase border ${MSG_STATUS_COLORS[msg.status] ?? MSG_STATUS_COLORS.pending}`}>
                    {msg.status}
                  </span>
                  <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] shrink-0">{msg.id.slice(0, 8)}</span>
                  <span className="text-xs text-[var(--hb-text-secondary)] truncate flex-1">{msg.message_type ?? msg.data_type ?? "\u2014"}</span>
                  <span className={`text-[10px] font-[family-name:var(--font-jetbrains)] font-bold uppercase shrink-0 ${msg.direction === "inbound" ? "text-blue-400" : "text-purple-400"}`}>
                    {msg.direction === "inbound" ? "IN" : "OUT"}
                  </span>
                  <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] shrink-0">
                    {msg.processing_time_ms ? `${msg.processing_time_ms}ms` : "\u2014"}
                  </span>
                  <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] shrink-0">
                    {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Server Log ───────────────────────────────────────── */}
        <div className="hb-animate-in hb-stagger-6 rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--hb-border)] flex items-center justify-between bg-[var(--hb-elevated)]/50">
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 rounded-full bg-[var(--hb-amber)]" />
              <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">Server Log</h2>
            </div>
            <Link href="/audit" className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-teal-dim)] hover:text-[var(--hb-teal)] transition-colors duration-200">
              View all
            </Link>
          </div>
          {logs.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-[var(--hb-text-ghost)]">No events logged</div>
          ) : (
            <div className="divide-y divide-[var(--hb-border-subtle)] max-h-80 overflow-y-auto">
              {logs.map((log) => {
                const levelColor =
                  log.level === "ERROR"
                    ? "text-[var(--hb-red)]"
                    : log.level === "WARNING"
                      ? "text-[var(--hb-amber)]"
                      : "text-[var(--hb-teal)]";
                const levelBg =
                  log.level === "ERROR"
                    ? "bg-[var(--hb-red)]/8"
                    : log.level === "WARNING"
                      ? "bg-[var(--hb-amber)]/8"
                      : "bg-[var(--hb-teal)]/8";
                return (
                  <div key={log.id} className={`px-5 py-2.5 ${levelBg} hover:bg-[var(--hb-elevated)]/30 transition-colors duration-150`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-jetbrains)] ${levelColor}`}>
                        {log.level}
                      </span>
                      <span className="text-xs text-[var(--hb-text-secondary)]">{log.event_name}</span>
                      <span className="text-[10px] font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-ghost)] ml-auto">
                        {new Date(log.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-xs text-[var(--hb-text-ghost)] truncate">{log.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
