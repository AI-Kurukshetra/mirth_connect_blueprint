import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteChannelButton } from "@/components/channels/delete-channel-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChannelForm } from "@/components/forms/channel-form";
import { getAuthContext } from "@/lib/authz";
import { getChannel } from "@/lib/data/medflow";
import type { ChannelInput } from "@/lib/validations/channel";

export default async function EditChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await getAuthContext();
  const channel = await getChannel(id);

  if (!channel) {
    notFound();
  }

  if (!permissions.canEdit) {
    redirect(`/channels/${channel.channel_id}`);
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
      <Card className="overflow-hidden p-0">
        <div className="bg-[linear-gradient(145deg,rgba(10,24,32,0.98),rgba(15,72,80,0.94)_42%,rgba(147,168,94,0.9)_100%)] p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="bg-white/10 text-white" tone="neutral">Edit channel</Badge>
              <h1 className="display-face mt-4 text-5xl text-white">Adjust lane {channel.channel_id} with the current route contour visible beside the form.</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">Update routing details, retry policy, and runtime state without losing sight of what this lane is doing in production terms.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-white/18 bg-white/8 px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-white/12" href={`/channels/${channel.channel_id}`}>
                Open lane
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-white/18 bg-white/8 px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-white/12" href={`/channels/${channel.channel_id}/designer`}>
                Open designer
              </Link>
            </div>
          </div>
        </div>
      </Card>
      <ChannelForm currentChannelId={channel.channel_id} initialValues={initialValues} mode="edit" />
      {permissions.canDelete ? (
        <Card className="p-6">
          <p className="text-sm font-semibold text-ink">Danger zone</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Deleting a channel removes the lane from the dashboard surface. Use this only when the integration is no longer needed.</p>
          <div className="mt-5"><DeleteChannelButton channelId={channel.channel_id} /></div>
        </Card>
      ) : null}
    </div>
  );
}