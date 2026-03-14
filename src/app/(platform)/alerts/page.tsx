"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AlertType =
  | "error"
  | "status_change"
  | "queue_threshold"
  | "processing_time"
  | "custom";

interface TriggerConditions {
  error_count?: number;
  time_window_minutes?: number;
  from_status?: string;
  to_status?: string;
  queue_size?: number;
  threshold_ms?: number;
  expression?: string;
}

interface Alert {
  id: string;
  name: string;
  enabled: boolean;
  alert_type: AlertType;
  channel_ids: string[];
  trigger_conditions: TriggerConditions;
  notification_template: string;
  notification_emails: string[];
  notification_channel_id: string | null;
  throttle_minutes: number;
  last_triggered_at?: string | null;
  created_at?: string;
}

interface Channel {
  id: string;
  name: string;
}

const ALERT_TYPE_OPTIONS: { value: AlertType; label: string }[] = [
  { value: "error", label: "Channel Error" },
  { value: "status_change", label: "Status Change" },
  { value: "queue_threshold", label: "Queue Threshold" },
  { value: "processing_time", label: "Processing Time" },
  { value: "custom", label: "Custom" },
];

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  error: "Channel Error",
  status_change: "Status Change",
  queue_threshold: "Queue Threshold",
  processing_time: "Processing Time",
  custom: "Custom",
};

const STATUS_OPTIONS = ["started", "stopped", "error", "paused", "deploying"];

const DEFAULT_TEMPLATE =
  "Alert: ${alertName} triggered on channel ${channelName}.\n${errorMessage}";

function emptyForm(): Omit<Alert, "id" | "created_at" | "last_triggered_at"> {
  return {
    name: "",
    enabled: true,
    alert_type: "error",
    channel_ids: [],
    trigger_conditions: { error_count: 5, time_window_minutes: 15 },
    notification_template: DEFAULT_TEMPLATE,
    notification_emails: [],
    notification_channel_id: null,
    throttle_minutes: 30,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [allChannels, setAllChannels] = useState(true);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Alert | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Test preview
  const [previewAlert, setPreviewAlert] = useState<Alert | null>(null);

  /* ---- data fetching ---- */

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [alertsRes, channelsRes] = await Promise.all([
      supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("channels").select("id, name"),
    ]);
    if (alertsRes.data) setAlerts(alertsRes.data as Alert[]);
    if (channelsRes.data) setChannels(channelsRes.data as Channel[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- helpers ---- */

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setAllChannels(true);
    setEmailInput("");
    setDialogOpen(true);
  }

  function openEdit(alert: Alert) {
    setEditingId(alert.id);
    setForm({
      name: alert.name,
      enabled: alert.enabled,
      alert_type: alert.alert_type,
      channel_ids: alert.channel_ids ?? [],
      trigger_conditions: alert.trigger_conditions ?? {},
      notification_template: alert.notification_template ?? DEFAULT_TEMPLATE,
      notification_emails: alert.notification_emails ?? [],
      notification_channel_id: alert.notification_channel_id,
      throttle_minutes: alert.throttle_minutes ?? 30,
    });
    setAllChannels(
      !alert.channel_ids || alert.channel_ids.length === 0
    );
    setEmailInput("");
    setDialogOpen(true);
  }

  function patchForm(patch: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function patchConditions(patch: Partial<TriggerConditions>) {
    setForm((prev) => ({
      ...prev,
      trigger_conditions: { ...prev.trigger_conditions, ...patch },
    }));
  }

  /* ---- save ---- */

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      enabled: form.enabled,
      alert_type: form.alert_type,
      channel_ids: allChannels ? [] : form.channel_ids,
      trigger_conditions: form.trigger_conditions,
      notification_template: form.notification_template,
      notification_emails: form.notification_emails,
      notification_channel_id: form.notification_channel_id || null,
      throttle_minutes: form.throttle_minutes,
    };

    if (editingId) {
      await supabase.from("alerts").update(payload).eq("id", editingId);
    } else {
      await supabase.from("alerts").insert(payload);
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
  }

  /* ---- toggle enabled ---- */

  async function toggleEnabled(alert: Alert) {
    const supabase = createClient();
    await supabase
      .from("alerts")
      .update({ enabled: !alert.enabled })
      .eq("id", alert.id);
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alert.id ? { ...a, enabled: !a.enabled } : a
      )
    );
  }

  /* ---- delete ---- */

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("alerts").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    fetchData();
  }

  /* ---- email tags ---- */

  function addEmail() {
    const email = emailInput.trim();
    if (!email || form.notification_emails.includes(email)) return;
    patchForm({
      notification_emails: [...form.notification_emails, email],
    });
    setEmailInput("");
  }

  function removeEmail(email: string) {
    patchForm({
      notification_emails: form.notification_emails.filter(
        (e) => e !== email
      ),
    });
  }

  /* ---- channel helpers ---- */

  function channelName(id: string) {
    return channels.find((c) => c.id === id)?.name ?? id.slice(0, 8);
  }

  function channelLabel(alert: Alert) {
    if (!alert.channel_ids || alert.channel_ids.length === 0)
      return "All Channels";
    if (alert.channel_ids.length <= 2)
      return alert.channel_ids.map(channelName).join(", ");
    return `${alert.channel_ids.length} channels`;
  }

  /* ---- test preview ---- */

  function renderPreview(alert: Alert) {
    let text = alert.notification_template || DEFAULT_TEMPLATE;
    text = text
      .replace(/\$\{alertName\}/g, alert.name)
      .replace(/\$\{channelName\}/g, "Lab-Results-ADT")
      .replace(/\$\{errorMessage\}/g, "Connection timed out after 30s")
      .replace(/\$\{errorCount\}/g, String(alert.trigger_conditions?.error_count ?? 5))
      .replace(/\$\{queueSize\}/g, String(alert.trigger_conditions?.queue_size ?? 100))
      .replace(/\$\{fromStatus\}/g, alert.trigger_conditions?.from_status ?? "started")
      .replace(/\$\{toStatus\}/g, alert.trigger_conditions?.to_status ?? "error")
      .replace(/\$\{thresholdMs\}/g, String(alert.trigger_conditions?.threshold_ms ?? 1000));
    return text;
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="hb-animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hb-text-primary)]">Alerts</h1>
          <p className="text-[var(--hb-text-secondary)] mt-1">
            Configure alert rules and notification channels
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--hb-teal-dim)] text-[var(--hb-text-primary)] text-sm font-medium hover:bg-[var(--hb-teal)] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Alert
        </button>
      </div>

      {/* Alert list */}
      <div className="bg-[var(--hb-surface)] rounded-xl border border-[var(--hb-border)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[var(--hb-border-bright)] border-t-[var(--hb-teal)] rounded-full animate-spin" />
            <p className="text-[var(--hb-text-tertiary)] mt-3 text-sm">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="w-12 h-12 text-[var(--hb-text-ghost)] mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            <h3 className="text-lg font-medium text-[var(--hb-text-secondary)] mb-2">
              No alerts configured
            </h3>
            <p className="text-[var(--hb-text-tertiary)] mb-6">
              Create alert rules to get notified about channel issues.
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--hb-teal-dim)] text-[var(--hb-text-primary)] text-sm font-medium hover:bg-[var(--hb-teal)] transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create First Alert
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--hb-border)] text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Channels</th>
                <th className="px-6 py-3 font-medium">Enabled</th>
                <th className="px-6 py-3 font-medium">Last Triggered</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hb-border)]">
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-[var(--hb-elevated)]/30 transition-colors"
                >
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--hb-amber)]/10 border border-[var(--hb-amber)]/20 flex items-center justify-center shrink-0">
                        <svg
                          className="w-4 h-4 text-[var(--hb-amber)]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                          />
                        </svg>
                      </div>
                      <span className="font-medium text-[var(--hb-text-primary)]">
                        {alert.name}
                      </span>
                    </div>
                  </td>

                  {/* Type badge */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] border border-[var(--hb-border)]">
                      {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                    </span>
                  </td>

                  {/* Channels */}
                  <td className="px-6 py-4 text-[var(--hb-text-secondary)]">
                    {channelLabel(alert)}
                  </td>

                  {/* Enabled toggle */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleEnabled(alert)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        alert.enabled ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border-bright)]"
                      }`}
                      role="switch"
                      aria-checked={alert.enabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          alert.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>

                  {/* Last triggered */}
                  <td className="px-6 py-4 text-[var(--hb-text-tertiary)] text-xs font-[family-name:var(--font-jetbrains)]">
                    {alert.last_triggered_at
                      ? new Date(alert.last_triggered_at).toLocaleString()
                      : "Never"}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPreviewAlert(alert)}
                        title="Test alert"
                        className="p-1.5 rounded-md text-[var(--hb-text-secondary)] hover:text-[var(--hb-amber)] hover:bg-[var(--hb-deep)] transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEdit(alert)}
                        title="Edit"
                        className="p-1.5 rounded-md text-[var(--hb-text-secondary)] hover:text-[var(--hb-teal)] hover:bg-[var(--hb-deep)] transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(alert)}
                        title="Delete"
                        className="p-1.5 rounded-md text-[var(--hb-text-secondary)] hover:text-[var(--hb-red)] hover:bg-[var(--hb-deep)] transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============================================================= */}
      {/*  Create / Edit Dialog (slide-over)                             */}
      {/* ============================================================= */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDialogOpen(false)}
          />

          {/* panel */}
          <div className="relative w-full max-w-lg bg-[var(--hb-obsidian)] border-l border-[var(--hb-border)] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[var(--hb-obsidian)] border-b border-[var(--hb-border)]">
              <h2 className="text-lg font-semibold text-[var(--hb-text-primary)]">
                {editingId ? "Edit Alert" : "New Alert"}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1 rounded-md text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-deep)] transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Alert name */}
              <div>
                <label className="block text-sm font-medium text-[var(--hb-text-secondary)] mb-1.5">
                  Alert Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                  placeholder="e.g. Lab channel error spike"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] placeholder-[var(--hb-text-tertiary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                />
              </div>

              {/* Alert type */}
              <div>
                <label className="block text-sm font-medium text-[var(--hb-text-secondary)] mb-1.5">
                  Alert Type
                </label>
                <select
                  value={form.alert_type}
                  onChange={(e) => {
                    const t = e.target.value as AlertType;
                    patchForm({ alert_type: t });
                    // set sensible defaults for trigger conditions
                    if (t === "error")
                      patchForm({
                        alert_type: t,
                        trigger_conditions: {
                          error_count: 5,
                          time_window_minutes: 15,
                        },
                      });
                    else if (t === "status_change")
                      patchForm({
                        alert_type: t,
                        trigger_conditions: {
                          from_status: "started",
                          to_status: "error",
                        },
                      });
                    else if (t === "queue_threshold")
                      patchForm({
                        alert_type: t,
                        trigger_conditions: { queue_size: 100 },
                      });
                    else if (t === "processing_time")
                      patchForm({
                        alert_type: t,
                        trigger_conditions: { threshold_ms: 5000 },
                      });
                    else
                      patchForm({
                        alert_type: t,
                        trigger_conditions: { expression: "" },
                      });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                >
                  {ALERT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel selector */}
              <div>
                <label className="block text-sm font-medium text-[var(--hb-text-secondary)] mb-1.5">
                  Channels
                </label>
                <label className="flex items-center gap-2 mb-2 text-sm text-[var(--hb-text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allChannels}
                    onChange={(e) => {
                      setAllChannels(e.target.checked);
                      if (e.target.checked) patchForm({ channel_ids: [] });
                    }}
                    className="rounded border-[var(--hb-border-bright)] bg-[var(--hb-deep)] text-[var(--hb-teal)] focus:border-[var(--hb-teal)]"
                  />
                  All Channels
                </label>
                {!allChannels && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--hb-border)] bg-[var(--hb-deep)] p-2 space-y-1">
                    {channels.length === 0 ? (
                      <p className="text-xs text-[var(--hb-text-tertiary)] px-2 py-1">
                        No channels found
                      </p>
                    ) : (
                      channels.map((ch) => (
                        <label
                          key={ch.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--hb-elevated)] cursor-pointer text-sm text-[var(--hb-text-secondary)]"
                        >
                          <input
                            type="checkbox"
                            checked={form.channel_ids.includes(ch.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                patchForm({
                                  channel_ids: [
                                    ...form.channel_ids,
                                    ch.id,
                                  ],
                                });
                              } else {
                                patchForm({
                                  channel_ids: form.channel_ids.filter(
                                    (id) => id !== ch.id
                                  ),
                                });
                              }
                            }}
                            className="rounded border-[var(--hb-border-bright)] bg-[var(--hb-deep)] text-[var(--hb-teal)] focus:border-[var(--hb-teal)]"
                          />
                          {ch.name}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Trigger conditions (type-dependent) */}
              <div>
                <label className="block text-sm font-medium text-[var(--hb-text-secondary)] mb-1.5">
                  Trigger Conditions
                </label>
                <div className="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-elevated)]/50 p-4 space-y-4">
                  {form.alert_type === "error" && (
                    <>
                      <div>
                        <label className="block text-xs text-[var(--hb-text-secondary)] mb-1">
                          Error Count Threshold
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={form.trigger_conditions.error_count ?? 5}
                          onChange={(e) =>
                            patchConditions({
                              error_count: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--hb-text-secondary)] mb-1">
                          Time Window (minutes)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={
                            form.trigger_conditions.time_window_minutes ?? 15
                          }
                          onChange={(e) =>
                            patchConditions({
                              time_window_minutes: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                        />
                      </div>
                    </>
                  )}

                  {form.alert_type === "status_change" && (
                    <>
                      <div>
                        <label className="block text-xs text-[var(--hb-text-secondary)] mb-1">
                          From Status
                        </label>
                        <select
                          value={
                            form.trigger_conditions.from_status ?? "started"
                          }
                          onChange={(e) =>
                            patchConditions({ from_status: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--hb-text-secondary)] mb-1">
                          To Status
                        </label>
                        <select
                          value={
                            form.trigger_conditions.to_status ?? "error"
                          }
                          onChange={(e) =>
                            patchConditions({ to_status: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {form.alert_type === "queue_threshold" && (
                    <div>
                      <label className="block text-xs text-[var(--hb-text-secondary)] mb-1">
                        Queue Size Threshold
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.trigger_conditions.queue_size ?? 100}
                        onChange={(e) =>
                          patchConditions({
                            queue_size: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                      />
                    </div>
                  )}

                  {form.alert_type === "processing_time" && (
                    <div>
                      <label className="block text-xs text-[var(--hb-text-secondary)] mb-1">
                        Processing Time Threshold (ms)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.trigger_conditions.threshold_ms ?? 5000}
                        onChange={(e) =>
                          patchConditions({
                            threshold_ms: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                      />
                    </div>
                  )}

                  {form.alert_type === "custom" && (
                    <div>
                      <label className="block text-xs text-[var(--hb-text-secondary)] mb-1">
                        Custom Expression
                      </label>
                      <input
                        type="text"
                        value={form.trigger_conditions.expression ?? ""}
                        onChange={(e) =>
                          patchConditions({ expression: e.target.value })
                        }
                        placeholder="e.g. error_rate > 0.1 && queue_size > 50"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] placeholder-[var(--hb-text-tertiary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Notification template */}
              <div>
                <label className="block text-sm font-medium text-[var(--hb-text-secondary)] mb-1.5">
                  Notification Template
                </label>
                <textarea
                  rows={4}
                  value={form.notification_template}
                  onChange={(e) =>
                    patchForm({ notification_template: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] placeholder-[var(--hb-text-tertiary)] text-sm font-[family-name:var(--font-jetbrains)] focus:outline-none focus:border-[var(--hb-teal)]"
                />
                <p className="mt-1 text-xs text-[var(--hb-text-tertiary)]">
                  Variables:{" "}
                  <code className="text-[var(--hb-text-secondary)]">
                    {"${alertName} ${channelName} ${errorMessage} ${errorCount} ${queueSize} ${fromStatus} ${toStatus} ${thresholdMs}"}
                  </code>
                </p>
              </div>

              {/* Notification emails */}
              <div>
                <label className="block text-sm font-medium text-[var(--hb-text-secondary)] mb-1.5">
                  Notification Emails
                </label>
                {form.notification_emails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.notification_emails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--hb-teal)]/10 text-[var(--hb-teal)] border border-[var(--hb-teal)]/20"
                      >
                        {email}
                        <button
                          onClick={() => removeEmail(email)}
                          className="hover:text-[var(--hb-red)] transition-colors"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                    placeholder="user@hospital.org"
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] placeholder-[var(--hb-text-tertiary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                  />
                  <button
                    onClick={addEmail}
                    type="button"
                    className="px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-secondary)] text-sm hover:bg-[var(--hb-elevated)] transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Throttle */}
              <div>
                <label className="block text-sm font-medium text-[var(--hb-text-secondary)] mb-1.5">
                  Throttle (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.throttle_minutes}
                  onChange={(e) =>
                    patchForm({ throttle_minutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--hb-deep)] border border-[var(--hb-border)] text-[var(--hb-text-primary)] text-sm focus:outline-none focus:border-[var(--hb-teal)]"
                />
                <p className="mt-1 text-xs text-[var(--hb-text-tertiary)]">
                  Minimum minutes between repeated notifications for the same
                  alert
                </p>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--hb-text-secondary)]">
                  Enabled
                </label>
                <button
                  onClick={() => patchForm({ enabled: !form.enabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    form.enabled ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border-bright)]"
                  }`}
                  role="switch"
                  aria-checked={form.enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      form.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-[var(--hb-obsidian)] border-t border-[var(--hb-border)]">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-lg bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] text-sm font-medium hover:bg-[var(--hb-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--hb-teal-dim)] text-[var(--hb-text-primary)] text-sm font-medium hover:bg-[var(--hb-teal)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Alert"
                  : "Create Alert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  Delete Confirmation Dialog                                    */}
      {/* ============================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-[var(--hb-surface)] rounded-xl border border-[var(--hb-border)] p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--hb-red)]/10 border border-[var(--hb-red)]/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[var(--hb-red)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--hb-text-primary)]">
                  Delete Alert
                </h3>
                <p className="text-sm text-[var(--hb-text-secondary)]">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--hb-text-secondary)] mb-6">
              Are you sure you want to delete{" "}
              <span className="font-medium text-[var(--hb-text-primary)]">
                {deleteTarget.name}
              </span>
              ? All associated configuration will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] text-sm font-medium hover:bg-[var(--hb-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-[var(--hb-red)] text-[var(--hb-text-primary)] text-sm font-medium hover:bg-[var(--hb-red)] transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Alert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  Test Preview Dialog                                           */}
      {/* ============================================================= */}
      {previewAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPreviewAlert(null)}
          />
          <div className="relative bg-[var(--hb-surface)] rounded-xl border border-[var(--hb-border)] p-6 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--hb-amber)]/10 border border-[var(--hb-amber)]/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[var(--hb-amber)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--hb-text-primary)]">
                  Alert Preview
                </h3>
              </div>
              <button
                onClick={() => setPreviewAlert(null)}
                className="p-1 rounded-md text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-deep)] transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-elevated)]/50 p-4">
                <p className="text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] mb-2">
                  Notification Output (sample data)
                </p>
                <pre className="text-sm text-[var(--hb-text-primary)] whitespace-pre-wrap font-[family-name:var(--font-jetbrains)] leading-relaxed">
                  {renderPreview(previewAlert)}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[var(--hb-text-tertiary)] mb-1">Type</p>
                  <p className="text-[var(--hb-text-secondary)]">
                    {ALERT_TYPE_LABELS[previewAlert.alert_type] ??
                      previewAlert.alert_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--hb-text-tertiary)] mb-1">Throttle</p>
                  <p className="text-[var(--hb-text-secondary)]">
                    {previewAlert.throttle_minutes} min
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--hb-text-tertiary)] mb-1">Recipients</p>
                  <p className="text-[var(--hb-text-secondary)]">
                    {previewAlert.notification_emails?.length
                      ? previewAlert.notification_emails.join(", ")
                      : "None configured"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--hb-text-tertiary)] mb-1">Channels</p>
                  <p className="text-[var(--hb-text-secondary)]">
                    {channelLabel(previewAlert)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end mt-6">
              <button
                onClick={() => setPreviewAlert(null)}
                className="px-4 py-2 rounded-lg bg-[var(--hb-deep)] text-[var(--hb-text-secondary)] text-sm font-medium hover:bg-[var(--hb-elevated)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
