"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-[var(--hb-deep)] rounded-lg animate-pulse flex items-center justify-center text-[var(--hb-text-tertiary)] text-sm">
      Loading editor...
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────

interface ConfigEntry {
  key: string;
  value: string;
  description: string;
}

interface GlobalScript {
  id: string;
  script: string;
  updated_at: string;
}

interface ServerSettings {
  server_name: string;
  environment: "dev" | "staging" | "prod";
  default_admin_email: string;
  max_processing_threads: number;
  server_timezone: string;
}

interface DataPrunerSettings {
  enabled: boolean;
  prune_content_days: number;
  prune_metadata_days: number;
  pruning_schedule: string;
  block_size: number;
}

interface NotificationSettings {
  default_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_from_address: string;
  smtp_tls: boolean;
}

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  organization: string | null;
  avatar_url: string | null;
  last_sign_in_at?: string | null;
}

type TabId =
  | "server"
  | "config-map"
  | "global-scripts"
  | "data-pruner"
  | "notifications"
  | "users";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ── Feedback Toast ────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-2xl text-sm font-medium transition-all ${
        type === "success"
          ? "bg-[var(--hb-green)]/90 text-[var(--hb-text-primary)]"
          : "bg-[var(--hb-red)]/90 text-[var(--hb-text-primary)]"
      }`}
    >
      {type === "success" ? (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      )}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-70 cursor-pointer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Shared UI Components ──────────────────────────────────────────────────

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--hb-text-primary)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--hb-text-secondary)]">{description}</p>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ label, htmlFor }: { label: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--hb-text-secondary)] mb-1.5">
      {label}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--hb-text-primary)] placeholder-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)] focus:border-[var(--hb-teal)] transition-colors disabled:opacity-50"
    />
  );
}

function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  id?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      disabled={disabled}
      className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--hb-text-primary)] focus:outline-none focus:border-[var(--hb-teal)] focus:border-[var(--hb-teal)] transition-colors disabled:opacity-50"
    />
  );
}

function SelectInput({
  id,
  value,
  onChange,
  options,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--hb-text-primary)] focus:outline-none focus:border-[var(--hb-teal)] focus:border-[var(--hb-teal)] transition-colors disabled:opacity-50 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:border-[var(--hb-teal)] disabled:opacity-50 ${
        checked ? "bg-[var(--hb-teal-dim)]" : "bg-[var(--hb-border-bright)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SaveButton({
  onClick,
  saving,
  label = "Save Changes",
}: {
  onClick: () => void;
  saving: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--hb-teal-dim)] hover:bg-[var(--hb-teal)] disabled:bg-[var(--hb-teal-dim)]/50 text-[var(--hb-text-primary)] text-sm font-medium rounded-lg transition-colors cursor-pointer"
    >
      {saving && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {saving ? "Saving..." : label}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-[var(--hb-deep)] rounded w-1/3" />
      <div className="h-10 bg-[var(--hb-deep)] rounded" />
      <div className="h-4 bg-[var(--hb-deep)] rounded w-1/4" />
      <div className="h-10 bg-[var(--hb-deep)] rounded" />
      <div className="h-4 bg-[var(--hb-deep)] rounded w-1/3" />
      <div className="h-10 bg-[var(--hb-deep)] rounded" />
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────

const TABS: TabDef[] = [
  {
    id: "server",
    label: "Server",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    id: "config-map",
    label: "Config Map",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    id: "global-scripts",
    label: "Scripts",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    id: "data-pruner",
    label: "Pruner",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: "users",
    label: "Users",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

const SCRIPT_NAMES = ["Deploy", "Undeploy", "Preprocessor", "Postprocessor"] as const;

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "operator", label: "Operator" },
  { value: "viewer", label: "Viewer" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[var(--hb-red)]/10 text-[var(--hb-red)] border-[var(--hb-red)]/20",
  developer: "bg-[var(--hb-teal)]/10 text-[var(--hb-teal)] border-[var(--hb-teal)]/20",
  operator: "bg-[var(--hb-amber)]/10 text-[var(--hb-amber)] border-[var(--hb-amber)]/20",
  viewer: "bg-[var(--hb-border)]/10 text-[var(--hb-text-secondary)] border-[var(--hb-border)]/20",
};

// ── Section: Server Settings ──────────────────────────────────────────────

function ServerSettingsSection({
  showToast,
}: {
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ServerSettings>({
    server_name: "HealthBridge Server",
    environment: "dev",
    default_admin_email: "",
    max_processing_threads: 4,
    server_timezone: "UTC",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("server_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings({
          server_name: data.server_name ?? "HealthBridge Server",
          environment: data.environment ?? "dev",
          default_admin_email: data.default_admin_email ?? "",
          max_processing_threads: data.max_processing_threads ?? 4,
          server_timezone: data.server_timezone ?? "UTC",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load server settings";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("server_settings").upsert(
        { id: "default", ...settings, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
      showToast("Server settings saved successfully", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save server settings";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const patch = (p: Partial<ServerSettings>) => setSettings((s) => ({ ...s, ...p }));

  return (
    <SectionShell title="Server Settings" description="Core server configuration for your HealthBridge instance.">
      <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel label="Server Name" htmlFor="server-name" />
            <TextInput id="server-name" value={settings.server_name} onChange={(v) => patch({ server_name: v })} placeholder="HealthBridge Server" />
          </div>
          <div>
            <FieldLabel label="Environment" htmlFor="env" />
            <SelectInput
              id="env"
              value={settings.environment}
              onChange={(v) => patch({ environment: v as ServerSettings["environment"] })}
              options={[
                { value: "dev", label: "Development" },
                { value: "staging", label: "Staging" },
                { value: "prod", label: "Production" },
              ]}
            />
          </div>
          <div>
            <FieldLabel label="Default Admin Email" htmlFor="admin-email" />
            <TextInput id="admin-email" value={settings.default_admin_email} onChange={(v) => patch({ default_admin_email: v })} placeholder="admin@hospital.org" type="email" />
          </div>
          <div>
            <FieldLabel label="Max Processing Threads" htmlFor="threads" />
            <NumberInput id="threads" value={settings.max_processing_threads} onChange={(v) => patch({ max_processing_threads: v })} min={1} max={64} />
          </div>
          <div>
            <FieldLabel label="Server Timezone" htmlFor="tz" />
            <SelectInput
              id="tz"
              value={settings.server_timezone}
              onChange={(v) => patch({ server_timezone: v })}
              options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <SaveButton onClick={save} saving={saving} />
        </div>
      </div>
    </SectionShell>
  );
}

// ── Section: Configuration Map ────────────────────────────────────────────

function ConfigMapSection({
  showToast,
}: {
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConfigEntry>({ key: "", value: "", description: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("configuration_map")
        .select("*")
        .order("key");
      if (error) throw error;
      setEntries(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load configuration map";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEntry = async (entry: ConfigEntry, isNew: boolean) => {
    setSavingKey(entry.key);
    try {
      const supabase = createClient();
      if (isNew) {
        const { error } = await supabase.from("configuration_map").insert(entry);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("configuration_map")
          .update({ value: entry.value, description: entry.description })
          .eq("key", entry.key);
        if (error) throw error;
      }
      showToast(`Configuration "${entry.key}" saved`, "success");
      setEditingKey(null);
      setIsAdding(false);
      setDraft({ key: "", value: "", description: "" });
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save configuration entry";
      showToast(message, "error");
    } finally {
      setSavingKey(null);
    }
  };

  const deleteEntry = async (key: string) => {
    if (!confirm(`Delete configuration key "${key}"?`)) return;
    setDeletingKey(key);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("configuration_map").delete().eq("key", key);
      if (error) throw error;
      showToast(`Configuration "${key}" deleted`, "success");
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete entry";
      showToast(message, "error");
    } finally {
      setDeletingKey(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <SectionShell title="Configuration Map" description="Key-value pairs accessible via $cfg('key') in channel scripts. Equivalent to Mirth's configuration map.">
      <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--hb-border)]">
          <span className="text-sm text-[var(--hb-text-secondary)]">{entries.length} entries</span>
          <button
            onClick={() => {
              setIsAdding(true);
              setDraft({ key: "", value: "", description: "" });
              setEditingKey(null);
            }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--hb-teal-dim)] hover:bg-[var(--hb-teal)] disabled:bg-[var(--hb-teal-dim)]/50 text-[var(--hb-text-primary)] text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Entry
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hb-border)]">
                <th className="text-left px-6 py-3 text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] w-1/4">Key</th>
                <th className="text-left px-6 py-3 text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] w-1/3">Value</th>
                <th className="text-left px-6 py-3 text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] w-1/3">Description</th>
                <th className="px-6 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hb-border)]/50">
              {/* Add new row */}
              {isAdding && (
                <tr className="bg-[var(--hb-elevated)]/30">
                  <td className="px-6 py-3">
                    <input
                      autoFocus
                      value={draft.key}
                      onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                      placeholder="config.key"
                      className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] placeholder-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)]"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      value={draft.value}
                      onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                      placeholder="value"
                      className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] placeholder-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)]"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      placeholder="Description"
                      className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] placeholder-[var(--hb-text-tertiary)] focus:outline-none focus:border-[var(--hb-teal)]"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (!draft.key.trim()) return;
                          saveEntry(draft, true);
                        }}
                        disabled={!draft.key.trim() || savingKey === draft.key}
                        className="p-1.5 text-[var(--hb-green)] hover:bg-[var(--hb-green)]/10 rounded transition-colors disabled:opacity-50 cursor-pointer"
                        title="Save"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setDraft({ key: "", value: "", description: "" });
                        }}
                        className="p-1.5 text-[var(--hb-text-secondary)] hover:bg-[var(--hb-elevated)] rounded transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {entries.map((entry) => {
                const isEditing = editingKey === entry.key;
                return (
                  <tr key={entry.key} className="hover:bg-[var(--hb-elevated)]/20 transition-colors">
                    <td className="px-6 py-3 font-[family-name:var(--font-jetbrains)] text-[var(--hb-teal)] text-xs">{entry.key}</td>
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={draft.value}
                          onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                          className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] focus:outline-none focus:border-[var(--hb-teal)]"
                        />
                      ) : (
                        <span className="text-[var(--hb-text-secondary)]">{entry.value}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input
                          value={draft.description}
                          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                          className="w-full bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] focus:outline-none focus:border-[var(--hb-teal)]"
                        />
                      ) : (
                        <span className="text-[var(--hb-text-tertiary)]">{entry.description || "--"}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEntry({ ...draft, key: entry.key }, false)}
                              disabled={savingKey === entry.key}
                              className="p-1.5 text-[var(--hb-green)] hover:bg-[var(--hb-green)]/10 rounded transition-colors disabled:opacity-50 cursor-pointer"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setEditingKey(null);
                                setDraft({ key: "", value: "", description: "" });
                              }}
                              className="p-1.5 text-[var(--hb-text-secondary)] hover:bg-[var(--hb-elevated)] rounded transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingKey(entry.key);
                                setDraft({ ...entry });
                                setIsAdding(false);
                              }}
                              className="p-1.5 text-[var(--hb-text-secondary)] hover:text-[var(--hb-teal)] hover:bg-[var(--hb-teal)]/10 rounded transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.key)}
                              disabled={deletingKey === entry.key}
                              className="p-1.5 text-[var(--hb-text-secondary)] hover:text-[var(--hb-red)] hover:bg-[var(--hb-red)]/10 rounded transition-colors disabled:opacity-50 cursor-pointer"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {entries.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--hb-text-tertiary)] text-sm">
                    No configuration entries yet. Click &quot;Add Entry&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionShell>
  );
}

// ── Section: Global Scripts ───────────────────────────────────────────────

function GlobalScriptsSection({
  showToast,
}: {
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [scripts, setScripts] = useState<Record<string, string>>({
    Deploy: "// Deploy script\n// Runs when channels are deployed\n",
    Undeploy: "// Undeploy script\n// Runs when channels are undeployed\n",
    Preprocessor: "// Global preprocessor\n// Runs before each message is processed\nreturn message;\n",
    Postprocessor: "// Global postprocessor\n// Runs after each message is processed\nreturn;\n",
  });
  const [activeScript, setActiveScript] = useState<string>("Deploy");
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("global_scripts").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        const scriptMap: Record<string, string> = {};
        const tsMap: Record<string, string> = {};
        data.forEach((row: GlobalScript) => {
          scriptMap[row.id] = row.script;
          tsMap[row.id] = row.updated_at;
        });
        setScripts((prev) => ({ ...prev, ...scriptMap }));
        setUpdatedAt(tsMap);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load global scripts";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase.from("global_scripts").upsert(
        { id: activeScript, script: scripts[activeScript], updated_at: now },
        { onConflict: "id" }
      );
      if (error) throw error;
      setUpdatedAt((prev) => ({ ...prev, [activeScript]: now }));
      showToast(`${activeScript} script saved successfully`, "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save script";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <SectionShell title="Global Scripts" description="Scripts that run at the server level during deploy, undeploy, and message processing lifecycle events.">
      <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl overflow-hidden">
        {/* Script tabs */}
        <div className="flex items-center border-b border-[var(--hb-border)] px-2">
          {SCRIPT_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => setActiveScript(name)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeScript === name
                  ? "text-[var(--hb-teal)] border-[var(--hb-teal)]"
                  : "text-[var(--hb-text-tertiary)] border-transparent hover:text-[var(--hb-text-secondary)]"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="h-80">
          <MonacoEditor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={scripts[activeScript]}
            onChange={(value) =>
              setScripts((prev) => ({ ...prev, [activeScript]: value ?? "" }))
            }
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12 },
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--hb-border)] bg-[var(--hb-surface)]">
          <span className="text-xs text-[var(--hb-text-tertiary)] font-[family-name:var(--font-jetbrains)]">
            {updatedAt[activeScript]
              ? `Last saved: ${new Date(updatedAt[activeScript]).toLocaleString()}`
              : "Not yet saved"}
          </span>
          <SaveButton onClick={save} saving={saving} label="Save Script" />
        </div>
      </div>
    </SectionShell>
  );
}

// ── Section: Data Pruner ──────────────────────────────────────────────────

function DataPrunerSection({
  showToast,
}: {
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DataPrunerSettings>({
    enabled: true,
    prune_content_days: 30,
    prune_metadata_days: 90,
    pruning_schedule: "0 0 3 * * ?",
    block_size: 1000,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("data_pruner_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings({
          enabled: data.enabled ?? true,
          prune_content_days: data.prune_content_days ?? 30,
          prune_metadata_days: data.prune_metadata_days ?? 90,
          pruning_schedule: data.pruning_schedule ?? "0 0 3 * * ?",
          block_size: data.block_size ?? 1000,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load pruner settings";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("data_pruner_settings").upsert(
        { id: "default", ...settings, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
      showToast("Data pruner settings saved successfully", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save pruner settings";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const patch = (p: Partial<DataPrunerSettings>) => setSettings((s) => ({ ...s, ...p }));

  return (
    <SectionShell title="Data Pruner" description="Configure automatic cleanup of old message content and metadata to manage storage.">
      <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl p-6 space-y-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 bg-[var(--hb-elevated)]/40 rounded-lg border border-[var(--hb-border)]">
          <div>
            <p className="text-sm font-medium text-[var(--hb-text-primary)]">Enable Data Pruning</p>
            <p className="text-xs text-[var(--hb-text-tertiary)] mt-0.5">Automatically remove old message data on a schedule</p>
          </div>
          <ToggleSwitch checked={settings.enabled} onChange={(v) => patch({ enabled: v })} />
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${!settings.enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <FieldLabel label="Prune Content (days)" htmlFor="prune-content" />
            <NumberInput id="prune-content" value={settings.prune_content_days} onChange={(v) => patch({ prune_content_days: v })} min={1} />
            <p className="text-xs text-[var(--hb-text-tertiary)] mt-1">Message body/content older than this will be removed</p>
          </div>
          <div>
            <FieldLabel label="Prune Metadata (days)" htmlFor="prune-meta" />
            <NumberInput id="prune-meta" value={settings.prune_metadata_days} onChange={(v) => patch({ prune_metadata_days: v })} min={1} />
            <p className="text-xs text-[var(--hb-text-tertiary)] mt-1">Message metadata older than this will be removed</p>
          </div>
          <div>
            <FieldLabel label="Pruning Schedule" htmlFor="prune-sched" />
            <TextInput id="prune-sched" value={settings.pruning_schedule} onChange={(v) => patch({ pruning_schedule: v })} placeholder="0 0 3 * * ?" />
            <p className="text-xs text-[var(--hb-text-tertiary)] mt-1">Cron expression (default: 3:00 AM daily)</p>
          </div>
          <div>
            <FieldLabel label="Block Size" htmlFor="block-size" />
            <NumberInput id="block-size" value={settings.block_size} onChange={(v) => patch({ block_size: v })} min={100} max={50000} />
            <p className="text-xs text-[var(--hb-text-tertiary)] mt-1">Number of records to prune per batch</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <SaveButton onClick={save} saving={saving} />
        </div>
      </div>
    </SectionShell>
  );
}

// ── Section: Notifications ────────────────────────────────────────────────

function NotificationsSection({
  showToast,
}: {
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    default_email: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_from_address: "",
    smtp_tls: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings({
          default_email: data.default_email ?? "",
          smtp_host: data.smtp_host ?? "",
          smtp_port: data.smtp_port ?? 587,
          smtp_username: data.smtp_username ?? "",
          smtp_password: data.smtp_password ?? "",
          smtp_from_address: data.smtp_from_address ?? "",
          smtp_tls: data.smtp_tls ?? true,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load notification settings";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("notification_settings").upsert(
        { id: "default", ...settings, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
      showToast("Notification settings saved successfully", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save notification settings";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    setTesting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("send-test-email", {
        body: {
          to: settings.default_email,
          smtp: {
            host: settings.smtp_host,
            port: settings.smtp_port,
            username: settings.smtp_username,
            password: settings.smtp_password,
            from: settings.smtp_from_address,
            tls: settings.smtp_tls,
          },
        },
      });
      if (error) throw error;
      showToast(`Test email sent to ${settings.default_email}`, "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send test email";
      showToast(message, "error");
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const patch = (p: Partial<NotificationSettings>) => setSettings((s) => ({ ...s, ...p }));

  return (
    <SectionShell title="Notifications" description="Configure email notifications and SMTP settings for alerts and reports.">
      <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl p-6 space-y-6">
        {/* Default email */}
        <div>
          <FieldLabel label="Default Notification Email" htmlFor="notif-email" />
          <TextInput id="notif-email" value={settings.default_email} onChange={(v) => patch({ default_email: v })} placeholder="alerts@hospital.org" type="email" />
        </div>

        {/* SMTP divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--hb-deep)]" />
          <span className="text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)]">SMTP Configuration</span>
          <div className="h-px flex-1 bg-[var(--hb-deep)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel label="SMTP Host" htmlFor="smtp-host" />
            <TextInput id="smtp-host" value={settings.smtp_host} onChange={(v) => patch({ smtp_host: v })} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <FieldLabel label="SMTP Port" htmlFor="smtp-port" />
            <NumberInput id="smtp-port" value={settings.smtp_port} onChange={(v) => patch({ smtp_port: v })} min={1} max={65535} />
          </div>
          <div>
            <FieldLabel label="Username" htmlFor="smtp-user" />
            <TextInput id="smtp-user" value={settings.smtp_username} onChange={(v) => patch({ smtp_username: v })} placeholder="username" />
          </div>
          <div>
            <FieldLabel label="Password" htmlFor="smtp-pass" />
            <TextInput id="smtp-pass" value={settings.smtp_password} onChange={(v) => patch({ smtp_password: v })} placeholder="********" type="password" />
          </div>
          <div>
            <FieldLabel label="From Address" htmlFor="smtp-from" />
            <TextInput id="smtp-from" value={settings.smtp_from_address} onChange={(v) => patch({ smtp_from_address: v })} placeholder="healthbridge@hospital.org" type="email" />
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-3 pb-1">
              <ToggleSwitch checked={settings.smtp_tls} onChange={(v) => patch({ smtp_tls: v })} />
              <span className="text-sm text-[var(--hb-text-secondary)]">Enable TLS/SSL</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={sendTestEmail}
            disabled={testing || !settings.default_email || !settings.smtp_host}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--hb-deep)] hover:bg-[var(--hb-elevated)] disabled:bg-[var(--hb-elevated)]/50 text-[var(--hb-text-secondary)] disabled:text-[var(--hb-text-ghost)] text-sm font-medium rounded-lg border border-[var(--hb-border)] transition-colors cursor-pointer"
          >
            {testing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
            {testing ? "Sending..." : "Send Test Email"}
          </button>
          <SaveButton onClick={save} saving={saving} />
        </div>
      </div>
    </SectionShell>
  );
}

// ── Section: Users & RBAC ─────────────────────────────────────────────────

function UsersSection({
  showToast,
}: {
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, organization, avatar_url")
        .order("full_name");
      if (error) throw error;
      setUsers(
        (data ?? []).map((u) => ({
          ...u,
          role: u.role ?? "viewer",
        }))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRole = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showToast("User role updated successfully", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update role";
      showToast(message, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <SectionShell title="Users & RBAC" description="Manage user accounts and role-based access control for your HealthBridge instance.">
      <div className="bg-[var(--hb-surface)] border border-[var(--hb-border)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--hb-border)]">
          <span className="text-sm text-[var(--hb-text-secondary)]">{users.length} users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hb-border)]">
                <th className="text-left px-6 py-3 text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)]">User</th>
                <th className="text-left px-6 py-3 text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)]">Organization</th>
                <th className="text-left px-6 py-3 text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)]">Role</th>
                <th className="text-left px-6 py-3 text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)] w-48">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hb-border)]/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--hb-elevated)]/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--hb-teal-dim)]/20 border border-[var(--hb-teal)]/30 flex items-center justify-center text-[var(--hb-teal)] text-xs font-semibold">
                          {(user.full_name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-[var(--hb-text-primary)]">
                          {user.full_name || "Unnamed User"}
                        </p>
                        <p className="text-xs text-[var(--hb-text-tertiary)] font-[family-name:var(--font-jetbrains)]">{user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--hb-text-secondary)]">{user.organization || "--"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        ROLE_COLORS[user.role] ?? ROLE_COLORS.viewer
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                      disabled={updatingId === user.id}
                      className="bg-[var(--hb-deep)] border border-[var(--hb-border)] rounded-lg px-2.5 py-1.5 text-sm text-[var(--hb-text-primary)] focus:outline-none focus:border-[var(--hb-teal)] disabled:opacity-50 cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--hb-text-tertiary)] text-sm">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionShell>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("server");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
    },
    []
  );

  const clearToast = useCallback(() => setToast(null), []);

  const renderSection = () => {
    switch (activeTab) {
      case "server":
        return <ServerSettingsSection showToast={showToast} />;
      case "config-map":
        return <ConfigMapSection showToast={showToast} />;
      case "global-scripts":
        return <GlobalScriptsSection showToast={showToast} />;
      case "data-pruner":
        return <DataPrunerSection showToast={showToast} />;
      case "notifications":
        return <NotificationsSection showToast={showToast} />;
      case "users":
        return <UsersSection showToast={showToast} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto hb-animate-in">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--hb-text-primary)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--hb-text-secondary)]">
          Manage your HealthBridge server configuration, scripts, and user access.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Left sidebar navigation */}
        <nav className="w-48 shrink-0">
          <ul className="space-y-0.5">
            {TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[var(--hb-teal-dim)]/10 text-[var(--hb-teal)] border border-[var(--hb-teal)]/20"
                      : "text-[var(--hb-text-secondary)] hover:text-[var(--hb-text-primary)] hover:bg-[var(--hb-elevated)]/60 border border-transparent"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">{renderSection()}</div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </div>
  );
}
