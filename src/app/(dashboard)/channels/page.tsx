import Link from "next/link";

import { ChannelHealthRing } from "@/components/channels/channel-health-ring";
import { ChannelLaneVisual } from "@/components/channels/channel-lane-visual";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { buildChannelRuntimeSnapshot, describeChannelHealth } from "@/lib/channels";
import { getChannels, getConnectors, getErrorLogs, getMessages } from "@/lib/data/medflow";
import { buildChannelHealthRows } from "@/lib/monitoring";

export default async function ChannelsPage() {
  const { permissions, role } = await getAuthContext();
  const [channels, connectors, messages, errors] = await Promise.all([
    getChannels(),
    getConnectors(),
    getMessages(),
    getErrorLogs(),
  ]);

  const channelMap = new Map(channels.map((channel) => [channel.channel_id, channel]));
  const healthRows = buildChannelHealthRows(channels, connectors, messages, errors);
  const stableCount = healthRows.filter((row) => row.healthScore >= 80).length;
  const watchCount = healthRows.filter((row) => row.healthScore >= 55 && row.healthScore < 80).length;
  const criticalCount = healthRows.filter((row) => row.healthScore < 55).length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(145deg,rgba(10,24,32,0.98),rgba(15,72,80,0.94)_40%,rgba(147,168,94,0.9)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <div>
            <Badge className="bg-white/10 text-white" tone="neutral">Integration lanes</Badge>
            <h1 className="display-face mt-4 text-5xl text-white">See lane health, runtime pressure, and flow posture before you ever open the designer.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">The channels surface now behaves like an operator board, not a simple list. Health rings, live posture, incidents, and route contours are visible up front.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="neutral">{channels.length} configured lanes</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{messages.length} recent message records</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{errors.filter((error) => !error.resolved).length} open incidents</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Stable lanes</p>
              <p className="mt-3 text-4xl font-semibold text-white">{stableCount}</p>
              <p className="mt-2 text-sm text-white/68">Health score 80 and above with acceptable runtime posture.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Watch list</p>
              <p className="mt-3 text-4xl font-semibold text-white">{watchCount}</p>
              <p className="mt-2 text-sm text-white/68">Degrading throughput, readiness, or incident pressure needs attention.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Critical lanes</p>
              <p className="mt-3 text-4xl font-semibold text-white">{criticalCount}</p>
              <p className="mt-2 text-sm text-white/68">Operator intervention recommended before more traffic is routed.</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-full border border-line-strong bg-white/78 px-4 py-2 text-sm font-semibold text-muted">
          {permissions.canCreate ? "Engineer or admin mode enabled" : role === "viewer" ? "Viewer mode: read-only access" : "Write access unavailable"}
        </div>
        {permissions.canCreate ? (
          <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href="/channels/add">Add channel</Link>
        ) : null}
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        {healthRows.map((row) => {
          const channel = channelMap.get(row.channelId);
          if (!channel) {
            return null;
          }

          const runtime = buildChannelRuntimeSnapshot(channel, messages, errors, connectors);
          const descriptor = describeChannelHealth(row.healthScore);

          return (
            <Card key={channel.id} className="overflow-hidden p-0">
              <div className="border-b border-line/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(236,245,240,0.76))] px-6 py-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${channel.status === "active" ? "bg-teal shadow-[0_0_0_6px_rgba(71,126,112,0.12)]" : channel.status === "error" ? "bg-alert shadow-[0_0_0_6px_rgba(207,106,65,0.1)]" : channel.status === "paused" ? "bg-gold shadow-[0_0_0_6px_rgba(201,148,72,0.1)]" : "bg-slate-400 shadow-[0_0_0_6px_rgba(148,163,184,0.12)]"}`} />
                      <Badge tone={channel.status === "active" ? "good" : channel.status === "error" ? "warm" : channel.status === "paused" ? "gold" : "neutral"}>{channel.status}</Badge>
                      <Badge tone={descriptor.tone}>{descriptor.label}</Badge>
                    </div>
                    <p className="mt-4 font-[family:var(--font-jetbrains)] text-[13px] font-semibold text-teal">{channel.channel_id}</p>
                    <Link className="mt-1 block text-2xl font-semibold text-ink" href={`/channels/${channel.channel_id}`}>{channel.name}</Link>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{channel.description}</p>
                  </div>
                  <ChannelHealthRing score={row.healthScore} />
                </div>
              </div>
              <div className="space-y-5 px-6 py-5">
                <ChannelLaneVisual compact destinationType={channel.destination_type} messageFormat={channel.message_format} sourceType={channel.source_type} status={channel.status} />
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-[22px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Volume</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{runtime.recentVolume}</p>
                  </div>
                  <div className="rounded-[22px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Success</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{runtime.successRate}%</p>
                  </div>
                  <div className="rounded-[22px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Incidents</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{runtime.openIncidents}</p>
                  </div>
                  <div className="rounded-[22px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Endpoint ready</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{runtime.endpointReadiness}%</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-3 text-sm text-muted">
                    <span>{channel.retry_count} retries / {channel.retry_interval}s</span>
                    <span>{runtime.averageLatencyMs ?? "n/a"} ms avg latency</span>
                    <span>{runtime.archived} archived</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link className="inline-flex h-10 items-center justify-center rounded-full border border-line-strong bg-white px-4 text-xs font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30" href={`/channels/${channel.channel_id}`}>
                      Open
                    </Link>
                    {permissions.canEdit ? (
                      <Link className="inline-flex h-10 items-center justify-center rounded-full border border-line-strong bg-white px-4 text-xs font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30" href={`/channels/${channel.channel_id}/edit`}>
                        Edit
                      </Link>
                    ) : null}
                    {permissions.canEdit ? (
                      <Link className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-xs font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href={`/channels/${channel.channel_id}/designer`}>
                        Designer
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}