import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getChannels } from "@/lib/data/medflow";

const toneMap = {
  active: "good",
  inactive: "neutral",
  error: "warm",
  paused: "gold",
} as const;

export default async function ChannelsPage() {
  const channels = await getChannels();

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge tone="gold">Integration lanes</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Channels</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Manage message flow definitions, routing formats, retries, and lane health.</p>
          </div>
          <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href="/channels/add">Add channel</Link>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/76 text-muted">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Format</th>
                <th className="px-6 py-4 font-semibold">Route</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => (
                <tr key={channel.id} className="border-t border-line/80 bg-white/40">
                  <td className="px-6 py-4 font-semibold text-ink">
                    <Link href={`/channels/${channel.channel_id}`}>{channel.channel_id}</Link>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-ink">{channel.name}</p>
                    <p className="mt-1 text-sm text-muted">{channel.description}</p>
                  </td>
                  <td className="px-6 py-4 text-muted">{channel.message_format}</td>
                  <td className="px-6 py-4 text-muted">{channel.source_type} to {channel.destination_type}</td>
                  <td className="px-6 py-4"><Badge tone={toneMap[channel.status]}>{channel.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

