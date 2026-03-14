import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChannelDesignerForm } from "@/components/channels/channel-designer-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getChannel } from "@/lib/data/medflow";
import { createClient } from "@/lib/supabase/server";
import type { ChannelDesignerInput } from "@/lib/validations/channel-designer";
import type { DestinationRow } from "@/types/database";

function stringifyRecord(value: Record<string, unknown> | null | undefined, fallback: Record<string, unknown>) {
  return JSON.stringify(value ?? fallback, null, 2);
}

function readScript(value: Record<string, unknown> | null | undefined) {
  return typeof value?.script === "string" ? value.script : "";
}

function mapSourceConnector(sourceType: string) {
  switch (sourceType) {
    case "MLLP":
    case "TCP":
      return "hl7_listener";
    case "REST":
      return "fhir_subscription";
    case "Database":
      return "database_reader";
    case "SFTP":
      return "file_reader";
    default:
      return "http_listener";
  }
}

function mapDestinationConnector(destinationType: string) {
  switch (destinationType) {
    case "MLLP":
    case "TCP":
      return "mllp_sender";
    case "Database":
      return "database_writer";
    case "SFTP":
      return "sftp_sender";
    case "REST":
      return "fhir_repository";
    default:
      return "http_sender";
  }
}

function buildFallbackDestination(messageFormat: ChannelDesignerInput["messageFormat"], destinationType: string) {
  return {
    name: "Primary destination",
    enabled: true,
    connectorType: mapDestinationConnector(destinationType),
    connectorProperties: JSON.stringify({ endpoint: "fill-me-in", protocol: destinationType.toLowerCase() }, null, 2),
    filterScript: "",
    transformerScript: "",
    responseTransformerScript: "",
    queueEnabled: true,
    retryCount: 3,
    retryIntervalMs: 30000,
    inboundDataType: messageFormat,
    outboundDataType: messageFormat,
  } satisfies ChannelDesignerInput["destinations"][number];
}

function mapDestination(destination: DestinationRow, messageFormat: ChannelDesignerInput["messageFormat"]) {
  return {
    id: destination.id,
    name: destination.name,
    enabled: destination.enabled,
    connectorType: destination.connector_type,
    connectorProperties: stringifyRecord(destination.connector_properties, { endpoint: "fill-me-in" }),
    filterScript: readScript(destination.filter),
    transformerScript: readScript(destination.transformer),
    responseTransformerScript: readScript(destination.response_transformer),
    queueEnabled: destination.queue_enabled,
    retryCount: destination.retry_count,
    retryIntervalMs: destination.retry_interval_ms,
    inboundDataType: (destination.inbound_data_type as ChannelDesignerInput["messageFormat"]) ?? messageFormat,
    outboundDataType: (destination.outbound_data_type as ChannelDesignerInput["messageFormat"]) ?? messageFormat,
  } satisfies ChannelDesignerInput["destinations"][number];
}

export default async function ChannelDesignerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await getAuthContext();
  const channel = await getChannel(id);

  if (!channel) {
    notFound();
  }

  if (!permissions.canEdit) {
    redirect(`/channels/${channel.channel_id}`);
  }

  const supabase = await createClient();
  const { data: destinations } = await supabase
    .from("destinations")
    .select("*")
    .eq("channel_id", channel.id)
    .order("sort_order");

  const initialValues: ChannelDesignerInput = {
    name: channel.name,
    description: channel.description ?? "",
    messageFormat: channel.message_format,
    status: channel.status,
    retryCount: channel.retry_count,
    retryInterval: channel.retry_interval,
    sourceConnectorType: channel.source_connector_type ?? mapSourceConnector(channel.source_type),
    sourceConnectorProperties: stringifyRecord(channel.source_connector_properties, { host: "fill-me-in", path: "/inbound" }),
    sourceFilterScript: readScript(channel.source_filter),
    sourceTransformerScript: readScript(channel.source_transformer),
    preprocessorScript: channel.preprocessor_script ?? "",
    postprocessorScript: channel.postprocessor_script ?? "",
    destinations: destinations && destinations.length > 0
      ? destinations.map((destination) => mapDestination(destination, channel.message_format))
      : [buildFallbackDestination(channel.message_format, channel.destination_type)],
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge tone="gold">Visual designer</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">{channel.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Configure source intake, transformation stages, and destination fan-out from the active MedFlow studio.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/channels/${channel.channel_id}`}>
              Back to channel
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href={`/simulator?channel=${channel.channel_id}`}>
              Test this lane
            </Link>
          </div>
        </div>
      </Card>

      <ChannelDesignerForm channelId={channel.channel_id} initialValues={initialValues} />
    </div>
  );
}
