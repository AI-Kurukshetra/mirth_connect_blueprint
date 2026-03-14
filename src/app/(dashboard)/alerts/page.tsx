import Link from "next/link";

import { TestAlertButton } from "@/components/alerts/test-alert-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAuthContext } from "@/lib/authz";
import { getAlertHistory, getAlerts } from "@/lib/data/medflow";
import { formatRelativeTime } from "@/lib/utils";

const channelToneMap = {
  email: "good",
  webhook: "neutral",
  slack: "gold",
  sms: "warm",
} as const;

const stateToneMap = {
  active: "good",
  inactive: "neutral",
} as const;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; query?: string; state?: string; trigger?: string }>;
}) {
  const { permissions } = await getAuthContext();
  const { channel = "all", query = "", state = "all", trigger = "all" } = await searchParams;
  const [alerts, history] = await Promise.all([getAlerts(), getAlertHistory()]);

  const historyMap = new Map<string, typeof history>();
  for (const item of history) {
    const bucket = historyMap.get(item.alert_id) ?? [];
    bucket.push(item);
    historyMap.set(item.alert_id, bucket);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = alerts.filter((alert) => {
    const matchesChannel = channel === "all" || alert.notification_channel === channel;
    const matchesState = state === "all" || (state === "active" && alert.is_active) || (state === "inactive" && !alert.is_active);
    const matchesTrigger = trigger === "all" || alert.trigger_type === trigger;
    const matchesQuery = !normalizedQuery || [
      alert.alert_id,
      alert.name,
      alert.description,
      alert.notification_target,
      alert.trigger_type,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));

    return matchesChannel && matchesState && matchesTrigger && matchesQuery;
  });

  const activeCount = alerts.filter((alert) => alert.is_active).length;
  const triggeredCount = alerts.filter((alert) => alert.last_triggered).length;
  const deliveredCount = history.filter((item) => item.notified).length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(17,32,42,0.98),rgba(62,27,20,0.94)_32%,rgba(207,106,65,0.88)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.18fr)_420px]">
          <div>
            <Badge className="bg-white/10 text-white" tone="neutral">Operator escalation grid</Badge>
            <h1 className="display-face mt-4 text-5xl text-white">Escalate the right signal before a quiet failure becomes a visible outage.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">Manage threshold rules, delivery targets, cooldown behavior, and recent trigger history across every MedFlow alert contract.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="neutral">{alerts.length} total rules</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{activeCount} active</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{deliveredCount} delivered events</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Active coverage</p>
              <p className="mt-3 text-4xl font-semibold text-white">{activeCount}</p>
              <p className="mt-2 text-sm text-white/68">Rules currently allowed to deliver notifications</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Triggered recently</p>
              <p className="mt-3 text-4xl font-semibold text-white">{triggeredCount}</p>
              <p className="mt-2 text-sm text-white/68">Rules that have fired at least once in the current data set</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Delivered history</p>
              <p className="mt-3 text-4xl font-semibold text-white">{deliveredCount}</p>
              <p className="mt-2 text-sm text-white/68">Recorded notifications in alert history</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]" method="get">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="query">Search</label>
              <Input defaultValue={query} id="query" name="query" placeholder="Search by alert ID, name, trigger, or delivery target" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="trigger">Trigger</label>
              <Select defaultValue={trigger} id="trigger" name="trigger">
                <option value="all">All triggers</option>
                <option value="error_rate">error rate</option>
                <option value="latency">latency</option>
                <option value="message_failure">message failure</option>
                <option value="channel_down">channel down</option>
                <option value="queue_depth">queue depth</option>
                <option value="custom">custom</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="channel">Delivery</label>
              <Select defaultValue={channel} id="channel" name="channel">
                <option value="all">All channels</option>
                <option value="email">email</option>
                <option value="webhook">webhook</option>
                <option value="slack">slack</option>
                <option value="sms">sms</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="state">State</label>
              <Select defaultValue={state} id="state" name="state">
                <option value="all">All states</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <Button aria-label="Apply alert filters" type="submit">Apply</Button>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/alerts">Reset</Link>
            </div>
          </form>
          {permissions.canCreate ? (
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href="/alerts/add">
              Add alert
            </Link>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-2">
        {filtered.map((alert) => {
          const alertHistory = (historyMap.get(alert.id) ?? []).slice(0, 2);
          return (
            <Card key={alert.id} className="overflow-hidden p-0">
              <div className="border-b border-line/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,232,226,0.72))] px-6 py-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={alert.is_active ? stateToneMap.active : stateToneMap.inactive}>{alert.is_active ? "active" : "inactive"}</Badge>
                      <Badge tone={channelToneMap[alert.notification_channel]}>{alert.notification_channel}</Badge>
                      <Badge tone="neutral">{alert.trigger_type.replaceAll("_", " ")}</Badge>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-ink">{alert.name}</h2>
                    <p className="mt-2 text-sm uppercase tracking-[0.18em] text-muted">{alert.alert_id}</p>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{alert.description ?? "No operator notes were added for this alert yet."}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    {permissions.canEdit ? <TestAlertButton alertId={alert.alert_id} variant="secondary" /> : null}
                    {permissions.canEdit ? (
                      <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/82 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/alerts/${alert.alert_id}/edit`}>
                        Open editor
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="grid gap-5 px-6 py-5 xl:grid-cols-[240px_minmax(0,1fr)]">
                <div className="rounded-[26px] border border-line-strong bg-white/78 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Escalation rule</p>
                  <p className="mt-3 text-3xl font-semibold text-ink">{alert.threshold_operator} {alert.threshold_value ?? "n/a"}</p>
                  <p className="mt-2 text-sm text-muted">Cooldown {alert.cooldown_minutes} min</p>
                  <p className="mt-1 text-sm text-muted">{alert.trigger_count} total triggers</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Target</p>
                    <p className="mt-2 text-sm font-semibold text-ink break-all">{alert.notification_target}</p>
                    <p className="mt-2 text-sm text-muted">Delivery target for simulated and runtime notifications.</p>
                  </div>
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Last triggered</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{alert.last_triggered ? formatRelativeTime(alert.last_triggered) : "Never triggered"}</p>
                    <p className="mt-2 text-sm text-muted">Recent operator validation remains visible here after manual tests too.</p>
                  </div>
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4 sm:col-span-2 xl:col-span-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recent history</p>
                    <div className="mt-2 space-y-2">
                      {alertHistory.length > 0 ? alertHistory.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-line/70 bg-white/70 px-3 py-2">
                          <p className="text-xs font-semibold text-ink">{item.trigger_value ?? "n/a"}</p>
                          <p className="mt-1 text-xs text-muted">{formatRelativeTime(item.triggered_at)}</p>
                        </div>
                      )) : <p className="text-sm text-muted">No events yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">No alerts found</p>
          <p className="mt-3 text-base leading-7 text-muted">Adjust the filters or create a new escalation rule to start notifying operators.</p>
        </Card>
      ) : null}
    </div>
  );
}