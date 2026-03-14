"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface EventEntry {
  id: string;
  level: string;
  event_name: string;
  user_id: string | null;
  ip_address: string | null;
  description: string | null;
  attributes: Record<string, unknown> | null;
  created_at: string;
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  INFO: {
    color: "text-[var(--hb-teal)]",
    bg: "bg-[var(--hb-teal)]/10 border-[var(--hb-teal)]/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
  WARNING: {
    color: "text-[var(--hb-amber)]",
    bg: "bg-[var(--hb-amber)]/10 border-[var(--hb-amber)]/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  ERROR: {
    color: "text-[var(--hb-red)]",
    bg: "bg-[var(--hb-red)]/10 border-[var(--hb-red)]/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
};

export default function AuditPage() {
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchEvents() {
      const supabase = createClient();
      let query = supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (levelFilter !== "all") {
        query = query.eq("level", levelFilter);
      }

      const { data } = await query;
      setEntries((data as EventEntry[]) ?? []);
      setLoading(false);
    }
    fetchEvents();
  }, [levelFilter]);

  return (
    <div className="hb-animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hb-text-primary)]">Event Log</h1>
          <p className="text-[var(--hb-text-tertiary)] text-sm mt-1 font-[family-name:var(--font-jetbrains)]">
            {entries.length} event{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["all", "INFO", "WARNING", "ERROR"].map((level) => (
            <button
              key={level}
              onClick={() => { setLoading(true); setLevelFilter(level); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors font-[family-name:var(--font-jetbrains)] ${
                levelFilter === level
                  ? "border-[var(--hb-teal)]/50 bg-[var(--hb-teal)]/10 text-[var(--hb-teal)]"
                  : "border-[var(--hb-border)] bg-[var(--hb-elevated)] text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)]"
              }`}
            >
              {level === "all" ? "All" : level}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--hb-border)] bg-[var(--hb-surface)] overflow-hidden hb-stagger-1">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[var(--hb-text-ghost)] border-t-[var(--hb-teal)] rounded-full animate-spin" />
            <p className="text-[var(--hb-text-tertiary)] mt-3 text-sm">Loading events...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-[var(--hb-text-ghost)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            <h3 className="text-lg font-medium text-[var(--hb-text-secondary)] mb-2">No events found</h3>
            <p className="text-[var(--hb-text-ghost)]">System events will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--hb-border)]/60">
            {entries.map((entry, index) => {
              const cfg = LEVEL_CONFIG[entry.level] ?? LEVEL_CONFIG.INFO;
              return (
                <div key={entry.id} className={`flex items-start gap-4 px-5 py-3.5 hover:bg-[var(--hb-elevated)]/30 transition-colors hb-stagger-${Math.min(index + 1, 5)}`}>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[var(--hb-text-primary)]">{entry.event_name}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider font-[family-name:var(--font-jetbrains)] ${cfg.color}`}>
                        {entry.level}
                      </span>
                    </div>
                    {entry.description && (
                      <p className="text-sm text-[var(--hb-text-secondary)] line-clamp-2">{entry.description}</p>
                    )}
                    {entry.attributes && Object.keys(entry.attributes).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.entries(entry.attributes).slice(0, 4).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-[family-name:var(--font-jetbrains)] bg-[var(--hb-deep)] text-[var(--hb-text-tertiary)] px-1.5 py-0.5 rounded">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-[var(--hb-text-ghost)] whitespace-nowrap font-[family-name:var(--font-jetbrains)]">
                      {new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <br />
                    <span className="text-[10px] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">
                      {new Date(entry.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
