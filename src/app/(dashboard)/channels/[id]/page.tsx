import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteChannelButton } from "@/components/channels/delete-channel-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getChannel, getMessages } from "@/lib/data/medflow";

export default async function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const channel = await getChannel(id);

  if (!channel) {
    notFound();
  }

  const messages = (await getMessages()).filter((message) => message.channel_id === channel.id).slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge tone={channel.status === "active" ? "good" : channel.status === "error" ? "warm" : "gold"}>{channel.status}</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">{channel.name}</h1>
            <p className="mt-3 text-base leading-8 text-muted">{channel.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/channels/${channel.channel_id}/edit`}>Edit lane</Link>
            <DeleteChannelButton channelId={channel.channel_id} />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Channel metadata</h2>
          <div className="mt-5 space-y-3 text-sm">
            <p><span className="font-semibold text-ink">Channel ID:</span> <span className="text-muted">{channel.channel_id}</span></p>
            <p><span className="font-semibold text-ink">Route:</span> <span className="text-muted">{channel.source_type} to {channel.destination_type}</span></p>
            <p><span className="font-semibold text-ink">Message format:</span> <span className="text-muted">{channel.message_format}</span></p>
            <p><span className="font-semibold text-ink">Retries:</span> <span className="text-muted">{channel.retry_count}</span></p>
            <p><span className="font-semibold text-ink">Retry interval:</span> <span className="text-muted">{channel.retry_interval}s</span></p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Latest messages</h2>
          <div className="mt-5 space-y-3">
            {messages.map((message) => (
              <Link key={message.id} className="block rounded-[24px] border border-line-strong bg-white/76 px-4 py-4 hover:-translate-y-0.5" href={`/messages/${message.message_id}`}>
                <p className="text-sm font-semibold text-ink">{message.message_id} - {message.message_type}</p>
                <p className="mt-1 text-sm text-muted">{message.source_system} to {message.destination_system}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
