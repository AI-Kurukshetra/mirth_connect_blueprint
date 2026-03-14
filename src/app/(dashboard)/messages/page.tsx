import Link from "next/link";

import { ArchiveMessageButton } from "@/components/messages/archive-message-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getMessages } from "@/lib/data/medflow";
import { summarizeMessages } from "@/lib/messages";
import { formatRelativeTime } from "@/lib/utils";

const toneMap = {
  processed: "good",
  failed: "warm",
  queued: "gold",
  retrying: "neutral",
  filtered: "neutral",
  archived: "neutral",
  received: "good",
  transformed: "good",
  sent: "good",
  error: "warm",
  pending: "gold",
} as const;

const filterableStatuses = ["all", "processed", "failed", "queued", "retrying", "filtered", "archived", "received", "transformed", "sent", "error", "pending"] as const;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string }>;
}) {
  const { permissions } = await getAuthContext();
  const { query = "", status = "all" } = await searchParams;
  const [messages, channels] = await Promise.all([getMessages(), getChannels()]);
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]));
  const summary = summarizeMessages(messages);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredMessages = messages.filter((message) => {
    const matchesStatus = status === "all" || message.status === status;
    const matchesQuery = !normalizedQuery || [
      message.message_id,
      message.message_type,
      message.source_system,
      message.destination_system,
      message.connector_name,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));

    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(145deg,rgba(11,23,31,0.98),rgba(13,63,64,0.96)_42%,rgba(147,168,94,0.9)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <div>
            <Badge className="bg-white/10 text-white" tone="neutral">Runtime message store</Badge>
            <h1 className="display-face mt-4 text-5xl text-white">Inspect active traffic, quarantine stale payloads, and keep archival decisions visible in the same ledger.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">The message explorer now treats archived traffic as first-class history instead of letting it disappear into raw status metadata.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="neutral">{summary.total} total messages</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{summary.archived} archived</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{filteredMessages.length} matching filters</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Archived volume</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.archived}</p>
              <p className="mt-2 text-sm text-white/68">Messages moved out of the active processing pool by operator action.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Failed traffic</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.failed}</p>
              <p className="mt-2 text-sm text-white/68">Messages still demanding operator review or replay.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur sm:col-span-2 xl:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Inflight pressure</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.inflight}</p>
              <p className="mt-2 text-sm text-white/68">Queued, retrying, or pending traffic still inside the runtime loop.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <form className="grid gap-4 md:grid-cols-[1.4fr_0.7fr_auto]" method="get">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="query">Search</label>
            <Input defaultValue={query} id="query" name="query" placeholder="Message ID, type, source, destination, or connector" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="status">Status</label>
            <Select defaultValue={status} id="status" name="status">
              {filterableStatuses.map((value) => (
                <option key={value} value={value}>{value === "all" ? "All statuses" : value}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <button className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" type="submit">Apply</button>
            <Link className="inline-flex h-12 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/messages">Reset</Link>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-6 py-5 text-sm text-muted">
          <span>{filteredMessages.length} messages</span>
          <span>{status === "all" ? "All statuses" : `Filtered by ${status}`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/76 text-muted">
              <tr>
                <th className="px-6 py-4 font-semibold">Message</th>
                <th className="px-6 py-4 font-semibold">Channel</th>
                <th className="px-6 py-4 font-semibold">Source / Destination</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Received</th>
                {permissions.canEdit ? <th className="px-6 py-4 font-semibold">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((message) => {
                const channel = message.channel_id ? channelMap.get(message.channel_id) : null;

                return (
                  <tr key={message.id} className={`border-t border-line/80 ${message.status === "archived" ? "bg-stone-50/80" : "bg-white/40"}`}>
                    <td className="px-6 py-4">
                      <Link className="font-semibold text-ink" href={`/messages/${message.message_id}`}>{message.message_id}</Link>
                      <p className="mt-1 text-sm text-muted">{message.message_type}</p>
                    </td>
                    <td className="px-6 py-4 text-muted">{channel?.channel_id ?? "Unassigned"}</td>
                    <td className="px-6 py-4 text-muted">{message.source_system} to {message.destination_system}</td>
                    <td className="px-6 py-4"><Badge tone={toneMap[message.status]}>{message.status}</Badge></td>
                    <td className="px-6 py-4 text-muted">{formatRelativeTime(message.created_at)}</td>
                    {permissions.canEdit ? (
                      <td className="px-6 py-4">
                        {message.status !== "archived" ? <ArchiveMessageButton messageId={message.message_id} variant="secondary" /> : <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Archived</span>}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}