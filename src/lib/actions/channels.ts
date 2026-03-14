"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/authz";
import { channelDesignerSchema, type ChannelDesignerInput } from "@/lib/validations/channel-designer";
import { channelSchema, type ChannelInput } from "@/lib/validations/channel";

import type { ActionState } from "@/lib/actions/auth";

function invalid(fieldErrors: Record<string, string[]>) {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
  } satisfies ActionState;
}

function mapConnectorType(type: string, direction: "source" | "destination") {
  if (type.includes("tcp") || type.includes("hl7")) {
    return direction === "source" ? "MLLP" : "TCP";
  }
  if (type.includes("http") || type.includes("ws") || type.includes("fhir")) {
    return type.includes("fhir") ? "REST" : "HTTP";
  }
  if (type.includes("database")) {
    return "Database";
  }
  if (type.includes("file") || type.includes("smtp") || type.includes("document")) {
    return "SFTP";
  }
  if (type.includes("channel") || type.includes("javascript")) {
    return direction === "source" ? "HTTP" : "REST";
  }

  return direction === "source" ? "HTTP" : "REST";
}

function jsonObject(value: string) {
  return JSON.parse(value) as Record<string, unknown>;
}

function scriptObject(script?: string) {
  const normalized = script?.trim();
  return normalized ? { script: normalized } : null;
}

export async function createChannelAction(input: ChannelInput): Promise<ActionState> {
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { supabase, user } = access;

  const { error } = await supabase.from("channels").insert({
    channel_id: parsed.data.channelId,
    name: parsed.data.name,
    description: parsed.data.description,
    source_type: parsed.data.sourceType,
    destination_type: parsed.data.destinationType,
    message_format: parsed.data.messageFormat,
    retry_count: parsed.data.retryCount,
    retry_interval: parsed.data.retryInterval,
    status: parsed.data.status,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/channels");

  return {
    success: true,
    message: "Channel created successfully.",
    redirectTo: `/channels/${parsed.data.channelId}`,
  };
}

export async function updateChannelAction(currentChannelId: string, input: ChannelInput): Promise<ActionState> {
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { supabase } = access;
  const { error } = await supabase
    .from("channels")
    .update({
      channel_id: parsed.data.channelId,
      name: parsed.data.name,
      description: parsed.data.description,
      source_type: parsed.data.sourceType,
      destination_type: parsed.data.destinationType,
      message_format: parsed.data.messageFormat,
      retry_count: parsed.data.retryCount,
      retry_interval: parsed.data.retryInterval,
      status: parsed.data.status,
    })
    .eq("channel_id", currentChannelId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/channels");
  revalidatePath(`/channels/${currentChannelId}`);
  revalidatePath(`/channels/${parsed.data.channelId}`);

  return {
    success: true,
    message: "Channel updated successfully.",
    redirectTo: `/channels/${parsed.data.channelId}`,
  };
}

export async function saveChannelDesignerAction(channelId: string, input: ChannelDesignerInput): Promise<ActionState> {
  const parsed = channelDesignerSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { supabase } = access;
  const sourceType = mapConnectorType(parsed.data.sourceConnectorType, "source");
  const firstDestination = parsed.data.destinations.find((item) => item.enabled) ?? parsed.data.destinations[0];
  const destinationType = mapConnectorType(firstDestination.connectorType, "destination");

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      message_format: parsed.data.messageFormat,
      status: parsed.data.status,
      enabled: parsed.data.status === "active",
      retry_count: parsed.data.retryCount,
      retry_interval: parsed.data.retryInterval,
      source_type: sourceType,
      destination_type: destinationType,
      source_connector_type: parsed.data.sourceConnectorType,
      source_connector_properties: jsonObject(parsed.data.sourceConnectorProperties),
      source_filter: scriptObject(parsed.data.sourceFilterScript),
      source_transformer: scriptObject(parsed.data.sourceTransformerScript),
      preprocessor_script: parsed.data.preprocessorScript?.trim() || null,
      postprocessor_script: parsed.data.postprocessorScript?.trim() || null,
    })
    .eq("channel_id", channelId)
    .select("id, channel_id")
    .single();

  if (channelError || !channel) {
    return { success: false, message: channelError?.message || "Failed to update channel designer." };
  }

  const { error: deleteError } = await supabase
    .from("destinations")
    .delete()
    .eq("channel_id", channel.id);

  if (deleteError) {
    return { success: false, message: deleteError.message };
  }

  const destinationRows = parsed.data.destinations.map((destination, index) => ({
    channel_id: channel.id,
    name: destination.name,
    sort_order: index,
    enabled: destination.enabled,
    connector_type: destination.connectorType,
    connector_properties: jsonObject(destination.connectorProperties),
    filter: scriptObject(destination.filterScript),
    transformer: scriptObject(destination.transformerScript),
    response_transformer: scriptObject(destination.responseTransformerScript),
    queue_enabled: destination.queueEnabled,
    retry_count: destination.retryCount,
    retry_interval_ms: destination.retryIntervalMs,
    rotate_queue: false,
    queue_thread_count: 1,
    inbound_data_type: destination.inboundDataType,
    outbound_data_type: destination.outboundDataType,
  }));

  const { error: insertError } = await supabase.from("destinations").insert(destinationRows);

  if (insertError) {
    return { success: false, message: insertError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/channels");
  revalidatePath(`/channels/${channel.channel_id}`);
  revalidatePath(`/channels/${channel.channel_id}/designer`);

  return {
    success: true,
    message: "Channel designer saved successfully.",
    redirectTo: `/channels/${channel.channel_id}/designer`,
  };
}

export async function deleteChannelAction(channelId: string): Promise<ActionState> {
  const access = await requireRole(["admin"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { supabase } = access;
  const { error } = await supabase.from("channels").delete().eq("channel_id", channelId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/channels");
  revalidatePath(`/channels/${channelId}`);

  return {
    success: true,
    message: "Channel deleted successfully.",
    redirectTo: "/channels",
  };
}
