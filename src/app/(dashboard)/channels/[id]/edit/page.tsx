import { notFound } from "next/navigation";

import { DeleteChannelButton } from "@/components/channels/delete-channel-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getChannel } from "@/lib/data/medflow";
import type { ChannelInput } from "@/lib/validations/channel";
import { ChannelForm } from "@/components/forms/channel-form";

export default async function EditChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const channel = await getChannel(id);

  if (!channel) {
    notFound();
  }

  const initialValues: ChannelInput = {
    channelId: channel.channel_id,
    name: channel.name,
    description: channel.description ?? "",
    sourceType: channel.source_type as ChannelInput["sourceType"],
    destinationType: channel.destination_type as ChannelInput["destinationType"],
    messageFormat: channel.message_format,
    retryCount: channel.retry_count,
    retryInterval: channel.retry_interval,
    status: channel.status,
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="gold">Edit channel</Badge>
        <h1 className="display-face mt-4 text-5xl text-ink">Adjust lane {channel.channel_id}</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">Update routing details, retry policy, and operational state with live Supabase persistence.</p>
      </Card>
      <Card className="p-6 sm:p-8">
        <ChannelForm currentChannelId={channel.channel_id} initialValues={initialValues} mode="edit" />
      </Card>
      <Card className="p-6">
        <p className="text-sm font-semibold text-ink">Danger zone</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Deleting a channel removes the lane from the dashboard surface. Use this only when the integration is no longer needed.</p>
        <div className="mt-5"><DeleteChannelButton channelId={channel.channel_id} /></div>
      </Card>
    </div>
  );
}
