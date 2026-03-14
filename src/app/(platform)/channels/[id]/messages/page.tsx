"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Channel {
  id: string;
  name: string;
  status: string | null;
  source_connector_type: string | null;
}

interface Message {
  id: string;
  channel_id: string;
  connector_name: string | null;
  status: string;
  message_type: string | null;
  data_type: string | null;
  direction: string | null;
  processing_time_ms: number | null;
  created_at: string;
  raw_content: string | null;
  error_content: string | null;
}

const STATUSES = ["RECEIVED", "TRANSFORMED", "FILTERED", "SENT", "QUEUED", "ERROR"] as const;
const PAGE_SIZE = 25;

const STATUS_COLORS: Record<string, string> = {
  received: "bg-[var(--hb-teal)]/15 text-[var(--hb-teal)] border-[var(--hb-teal)]/25",
  transformed: "bg-[var(--hb-cyan)]/15 text-[var(--hb-cyan)] border-[var(--hb-cyan)]/25",
  filtered: "bg-[var(--hb-text-tertiary)]/15 text-[var(--hb-text-secondary)] border-[var(--hb-text-tertiary)]/25",
  sent: "bg-[var(--hb-green)]/15 text-[var(--hb-green)] border-[var(--hb-green)]/25",
  queued: "bg-[var(--hb-amber)]/15 text-[var(--hb-amber)] border-[var(--hb-amber)]/25",
  error: "bg-[var(--hb-red)]/15 text-[var(--hb-red)] border-[var(--hb-red)]/25",
  pending: "bg-[var(--hb-text-ghost)]/15 text-[var(--hb-text-tertiary)] border-[var(--hb-text-ghost)]/25",
};

export default function ChannelMessagesPage() {
  const params = useParams();
  const channelId = params.id as string;

  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filters
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const fetchChannel = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("channels").select("id, name, status, source_connector_type").eq("id", channelId).single();
    if (data) setChannel(data);
  }, [channelId]);

  const fetchMessages = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("messages")
      .select("id, channel_id, connector_name, status, message_type, data_type, direction, processing_time_ms, created_at, raw_content, error_content", { count: "exact" })
      .eq("channel_id", channelId);

    if (statusFilters.size > 0) {
      query = query.in("status", Array.from(statusFilters));
    }
    if (dateFrom) {
      query = query.gte("created_at", new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      query = query.lte("created_at", to.toISOString());
    }
    if (contentSearch.trim()) {
      query = query.ilike("raw_content", `%${contentSearch.trim()}%`);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      setMessages(data as Message[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [channelId, statusFilters, dateFrom, dateTo, contentSearch, page]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  useEffect(() => {
    setLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchMessages();
      }, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchMessages]);

  function toggleStatus(s: string) {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
    setPage(0);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  }

  async function reprocessSelected() {
    if (selectedIds.size === 0) return;
    setReprocessing(true);
    const supabase = createClient();
    const ids = Array.from(selectedIds);
    await supabase.from("messages").update({ status: "QUEUED" }).in("id", ids);
    setSelectedIds(new Set());
    setReprocessing(false);
    fetchMessages();
  }

  function applyFilters() {
    setPage(0);
    setLoading(true);
    fetchMessages();
  }

  function clearFilters() {
    setStatusFilters(new Set());
    setDateFrom("");
    setDateTo("");
    setContentSearch("");
    setPage(0);
  }

  const fromIndex = page * PAGE_SIZE + 1;
  const toIndex = Math.min((page + 1) * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between hb-animate-in">
        <div className="flex items-center gap-4">
          <Link
            href={`/channels/${channelId}`}
            className="p-2 text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-deep)] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--hb-text-primary)]">
                {channel?.name ?? "Channel"} Messages
              </h1>
              {channel?.status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  channel.status.toLowerCase() === "started" || channel.status.toLowerCase() === "active"
                    ? "bg-[var(--hb-green)]/15 text-[var(--hb-green)] border-[var(--hb-green)]/25"
                    : channel.status.toLowerCase() === "stopped"
                      ? "bg-[var(--hb-red)]/15 text-[var(--hb-red)] border-[var(--hb-red)]/25"
                      : "bg-[var(--hb-text-tertiary)]/15 text-[var(--hb-text-secondary)] border-[var(--hb-text-tertiary)]/25"
                }`}>
                  {channel.status}
                </span>
              )}
            </div>
            <p className="text-[var(--hb-text-tertiary)] text-sm mt-0.5">
              {channel?.source_connector_type ? `${channel.source_connector_type} connector` : "Message browser for this channel"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border)]"}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[var(--hb-text-primary)] transition-transform ${autoRefresh ? "translate-x-4" : ""}`}
              />
            </div>
            <span className="text-sm text-[var(--hb-text-secondary)]">Auto-refresh</span>
          </label>
          <button
            onClick={() => { setLoading(true); fetchMessages(); }}
            className="hb-btn-ghost"
          >
            <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] p-4 hb-animate-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status multi-select */}
          <div className="relative">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1.5">Status</label>
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] text-sm rounded-lg px-3 py-2 text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[var(--hb-teal)]"
            >
              <span className="text-[var(--hb-text-secondary)] truncate">
                {statusFilters.size === 0 ? "All Statuses" : `${statusFilters.size} selected`}
              </span>
              <svg className="w-4 h-4 text-[var(--hb-text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {statusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
                <div className="absolute z-20 mt-1 w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg shadow-xl py-1">
                  {STATUSES.map((s) => (
                    <label key={s} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--hb-surface)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusFilters.has(s)}
                        onChange={() => toggleStatus(s)}
                        className="rounded border-[var(--hb-border)] bg-[var(--hb-deep)] text-[var(--hb-teal)] focus:ring-[var(--hb-teal)] focus:ring-offset-0"
                      />
                      <span className="text-sm text-[var(--hb-text-secondary)]">{s}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Date From */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1.5">From</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="hb-input w-full"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1.5">To</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="hb-input w-full"
            />
          </div>

          {/* Content Search */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1.5">Content Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-[var(--hb-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
                placeholder="Search content..."
                className="hb-input w-full pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--hb-border)]">
          <button
            onClick={clearFilters}
            className="text-sm text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-secondary)] transition-colors"
          >
            Clear all filters
          </button>
          <button
            onClick={applyFilters}
            className="hb-btn-primary"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-[var(--hb-teal)]/10 border border-[var(--hb-teal)]/25 rounded-xl px-4 py-3 flex items-center justify-between hb-animate-in">
          <span className="text-sm text-[var(--hb-teal)] font-[family-name:var(--font-jetbrains)]">
            {selectedIds.size} message{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={reprocessSelected}
              disabled={reprocessing}
              className="hb-btn-primary disabled:opacity-50"
            >
              {reprocessing ? "Reprocessing..." : "Reprocess Selected"}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Message Table */}
      <div className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] hb-animate-in">
        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block w-8 h-8 border-2 border-[var(--hb-border)] border-t-[var(--hb-teal)] rounded-full animate-spin" />
            <p className="text-[var(--hb-text-tertiary)] mt-4 text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-16 text-center">
            <svg className="w-14 h-14 text-[var(--hb-text-ghost)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <h3 className="text-lg font-medium text-[var(--hb-text-secondary)] mb-2">No messages found</h3>
            <p className="text-[var(--hb-text-tertiary)] text-sm">No messages match the current filters for this channel.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--hb-border)]">
                    <th className="text-left px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === messages.length && messages.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-[var(--hb-border)] bg-[var(--hb-deep)] text-[var(--hb-teal)] focus:ring-[var(--hb-teal)] focus:ring-offset-0"
                      />
                    </th>
                    <th className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-left px-4 py-3">ID</th>
                    <th className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-left px-4 py-3">Status</th>
                    <th className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-left px-4 py-3">Type</th>
                    <th className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-left px-4 py-3">Direction</th>
                    <th className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-left px-4 py-3">Connector</th>
                    <th className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-left px-4 py-3">Processing</th>
                    <th className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] text-left px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hb-border)]/50">
                  {messages.map((msg) => (
                    <>
                      <tr
                        key={msg.id}
                        onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                        className={`cursor-pointer transition-colors ${expandedId === msg.id ? "bg-[var(--hb-deep)]/70" : "hover:bg-[var(--hb-deep)]/40"}`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(msg.id)}
                            onChange={() => toggleSelect(msg.id)}
                            className="rounded border-[var(--hb-border)] bg-[var(--hb-deep)] text-[var(--hb-teal)] focus:ring-[var(--hb-teal)] focus:ring-offset-0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/messages/${msg.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-teal)] hover:text-[var(--hb-cyan)] hover:underline"
                          >
                            {msg.id.substring(0, 8)}...
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[msg.status?.toLowerCase()] ?? "bg-[var(--hb-text-tertiary)]/15 text-[var(--hb-text-secondary)] border-[var(--hb-text-tertiary)]/25"}`}>
                            {msg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--hb-text-secondary)]">{msg.message_type ?? "--"}</td>
                        <td className="px-4 py-3">
                          {msg.direction ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${msg.direction === "IN" || msg.direction === "INBOUND" ? "bg-[var(--hb-teal)]/15 text-[var(--hb-teal)]" : "bg-purple-500/15 text-purple-400"}`}>
                              {msg.direction === "IN" || msg.direction === "INBOUND" ? (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                                </svg>
                              )}
                              {msg.direction}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--hb-text-ghost)]">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--hb-text-secondary)]">{msg.connector_name ?? "--"}</td>
                        <td className="px-4 py-3 text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">
                          {msg.processing_time_ms != null ? `${msg.processing_time_ms}ms` : "--"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--hb-text-tertiary)] whitespace-nowrap">
                          {new Date(msg.created_at).toLocaleString()}
                        </td>
                      </tr>
                      {/* Expanded detail panel */}
                      {expandedId === msg.id && (
                        <tr key={`${msg.id}-detail`}>
                          <td colSpan={8} className="bg-[var(--hb-deep)] border-t border-[var(--hb-border)]">
                            <div className="p-5 space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-[var(--hb-text-primary)]">Message Preview</h4>
                                <Link
                                  href={`/messages/${msg.id}`}
                                  className="text-xs text-[var(--hb-teal)] hover:text-[var(--hb-cyan)] font-medium"
                                >
                                  Open Full Detail View &rarr;
                                </Link>
                              </div>
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Message ID</span>
                                  <span className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">{msg.id}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Connector</span>
                                  <span className="text-sm text-[var(--hb-text-secondary)]">{msg.connector_name ?? "--"}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Data Type</span>
                                  <span className="text-sm text-[var(--hb-text-secondary)]">{msg.data_type ?? "--"}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1">Processing Time</span>
                                  <span className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--hb-text-secondary)]">
                                    {msg.processing_time_ms != null ? `${msg.processing_time_ms}ms` : "--"}
                                  </span>
                                </div>
                              </div>
                              {msg.raw_content && (
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)] block mb-1.5">Raw Content (Preview)</span>
                                  <pre className="bg-[var(--hb-obsidian)] border border-[var(--hb-border)] rounded-lg p-3 text-xs text-[var(--hb-text-secondary)] font-[family-name:var(--font-jetbrains)] overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                                    {msg.raw_content.substring(0, 1000)}
                                    {msg.raw_content.length > 1000 && "\n..."}
                                  </pre>
                                </div>
                              )}
                              {msg.error_content && (
                                <div>
                                  <span className="block text-xs text-[var(--hb-red)] mb-1.5">Error</span>
                                  <pre className="bg-[var(--hb-red)]/10 border border-[var(--hb-red)]/20 rounded-lg p-3 text-xs text-[var(--hb-red)] font-[family-name:var(--font-jetbrains)] overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                                    {msg.error_content.substring(0, 500)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--hb-border)]">
              <p className="text-sm text-[var(--hb-text-tertiary)]">
                Showing <span className="font-medium text-[var(--hb-text-secondary)] font-[family-name:var(--font-jetbrains)]">{fromIndex}</span>-<span className="font-medium text-[var(--hb-text-secondary)] font-[family-name:var(--font-jetbrains)]">{toIndex}</span> of <span className="font-medium text-[var(--hb-text-secondary)] font-[family-name:var(--font-jetbrains)]">{totalCount}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="hb-btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--hb-text-tertiary)] px-2 font-[family-name:var(--font-jetbrains)]">
                  Page {page + 1} of {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= totalCount}
                  className="hb-btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
