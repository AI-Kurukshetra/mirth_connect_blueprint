import Link from "next/link";
import { notFound } from "next/navigation";

import { ChannelHealthRing } from "@/components/channels/channel-health-ring";
import { ChannelLaneVisual } from "@/components/channels/channel-lane-visual";
import { DeleteChannelButton } from "@/components/channels/delete-channel-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { buildChannelRuntimeSnapshot, describeChannelHealth } from "@/lib/channels";
import { getChannel, getConnectors, getErrorLogs, getMessages } from "@/lib/data/medflow";
import { buildChannelHealthRows } from "@/lib/monitoring";
import { formatRelativeTime } from "@/lib/utils";

export default async function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions, role } = await getAuthContext();
  const channel = await getChannel(id);

  if (!channel) {
    notFound();
  }

  const [messages, connectors, errors] = await Promise.all([
    getMessages(),
    getConnectors(),
    getErrorLogs(),
  ]);
  const channelMessages = messages.filter((message) => message.channel_id === channel.id).slice(0, 5);
  const channelIncidents = errors.filter((error) => error.channel_id === channel.id && !error.resolved).slice(0, 4);
  const healthRow = buildChannelHealthRows([channel], connectors, messages, errors)[0];
  const runtime = buildChannelRuntimeSnapshot(channel, messages, errors, connectors);
  const descriptor = describeChannelHealth(healthRow.healthScore);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(145deg,rgba(10,24,32,0.98),rgba(15,72,80,0.94)_42%,rgba(147,168,94,0.9)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/10 text-white" tone="neutral">{channel.channel_id}</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{channel.status}</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{descriptor.label}</Badge>
            </div>
            <h1 className="display-face mt-4 text-5xl text-white">{channel.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">{channel.description}</p>
            <p className="mt-3 text-sm font-semibold text-white/62">{runtime.lastMessageAt ? `Last traffic ${formatRelativeTime(runtime.lastMessageAt)}` : "No traffic recorded yet"} in {role} access mode.</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 rounded-[30px] border border-white/12 bg-white/8 p-6 backdrop-blur">
            <ChannelHealthRing score={healthRow.healthScore} size="lg" />
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Runtime posture</p>
              <p className="mt-2 text-lg font-semibold text-white">{descriptor.label}</p>
              <p className="mt-2 text-sm text-white/68">{runtime.endpointReadiness}% endpoint readiness with {runtime.openIncidents} active incidents.</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        {permissions.canCreate ? (
          <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/simulator?channel=${channel.channel_id}`}>
            Run test
          </Link>
        ) : null}
        {permissions.canEdit ? (
          <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href={`/channels/${channel.channel_id}/designer`}>
            Open designer
          </Link>
        ) : null}
        {permissions.canEdit ? (
          <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/channels/${channel.channel_id}/edit`}>
            Edit lane
          </Link>
        ) : null}
        {permissions.canDelete ? <DeleteChannelButton channelId={channel.channel_id} /> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Live topology</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Route contour, retry posture, and transport shape for this lane.</p>
            </div>
            <Badge tone={descriptor.tone}>{descriptor.label}</Badge>
          </div>
          <div className="mt-5 space-y-4">
            <ChannelLaneVisual destinationType={channel.destination_type} messageFormat={channel.message_format} sourceType={channel.source_type} status={channel.status} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-line-strong bg-white/76 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Retry policy</p>
                <p className="mt-2 font-semibold text-ink">{channel.retry_count} attempts / {channel.retry_interval}s</p>
              </div>
              <div className="rounded-[22px] border border-line-strong bg-white/76 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Format</p>
                <p className="mt-2 font-semibold text-ink">{channel.message_format.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-[22px] border border-line-strong bg-white/76 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Open incidents</p>
                <p className="mt-2 font-semibold text-ink">{runtime.openIncidents}</p>
              </div>
              <div className="rounded-[22px] border border-line-strong bg-white/76 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Archived traffic</p>
                <p className="mt-2 font-semibold text-ink">{runtime.archived}</p>
              </div>
            </div>
            <div className="rounded-[24px] border border-line-strong bg-[#f8f4ec] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Designer shortcut</p>
              <p className="mt-3 text-sm leading-6 text-muted">Use the visual designer to tune connector JSON, filter scripts, transformer stages, and destination queue settings without dropping to raw SQL.</p>
              {permissions.canEdit ? (
                <Link className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30" href={`/channels/${channel.channel_id}/designer`}>
                  Open channel studio
                </Link>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Runtime health</h2>
              <p className="mt-2 text-sm leading-6 text-muted">A lane-level snapshot of success, latency, readiness, and current incident load.</p>
            </div>
            <Badge tone="neutral">{role}</Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-line-strong bg-white/76 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recent volume</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{runtime.recentVolume}</p>
            </div>
            <div className="rounded-[22px] border border-line-strong bg-white/76 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Success rate</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{runtime.successRate}%</p>
            </div>
            <div className="rounded-[22px] border border-line-strong bg-white/76 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Avg latency</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{runtime.averageLatencyMs ?? "n/a"}</p>
            </div>
            <div className="rounded-[22px] border border-line-strong bg-white/76 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Endpoint readiness</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{runtime.endpointReadiness}%</p>
            </div>
          </div>
          <div className="mt-5 rounded-[24px] border border-line-strong bg-white/78 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Incident watchlist</p>
                <p className="mt-2 text-sm text-muted">Active incidents tied to this lane.</p>
              </div>
              <Badge tone={channelIncidents.length > 0 ? "warm" : "good"}>{channelIncidents.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {channelIncidents.length > 0 ? channelIncidents.map((incident) => (
                <Link key={incident.id} className="block rounded-[20px] border border-line-strong bg-white px-4 py-4 hover:-translate-y-0.5" href="/errors">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{incident.error_code}</p>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{formatRelativeTime(incident.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{incident.error_message}</p>
                </Link>
              )) : (
                <div className="rounded-[20px] border border-line-strong bg-[#f8f4ec] px-4 py-5 text-sm text-muted">No unresolved incidents are currently attached to this lane.</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Latest messages</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Recent traffic that ran through this lane. Open a message to inspect payload and reprocess options.</p>
          </div>
          <Badge tone="gold">{channelMessages.length} recent</Badge>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {channelMessages.length > 0 ? channelMessages.map((message) => (
            <Link key={message.id} className="block rounded-[24px] border border-line-strong bg-white/76 px-4 py-4 hover:-translate-y-0.5" href={`/messages/${message.message_id}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{message.message_id}</p>
                <Badge tone={message.status === "processed" || message.status === "sent" ? "good" : message.status === "archived" ? "neutral" : message.status === "queued" || message.status === "pending" ? "gold" : "warm"}>{message.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{message.message_type}</p>
              <p className="mt-2 text-sm text-muted">{message.source_system} to {message.destination_system}</p>
            </Link>
          )) : (
            <div className="rounded-[24px] border border-line-strong bg-[#f8f4ec] px-4 py-5 text-sm text-muted">No message history has been recorded for this lane yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}