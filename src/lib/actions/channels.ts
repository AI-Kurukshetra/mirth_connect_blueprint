"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { channelSchema, type ChannelInput } from "@/lib/validations/channel";

import type { ActionState } from "@/lib/actions/auth";

function invalid(fieldErrors: Record<string, string[]>) {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
  } satisfies ActionState;
}

export async function createChannelAction(input: ChannelInput): Promise<ActionState> {
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

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
    created_by: userData.user?.id ?? null,
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

  const supabase = await createClient();
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

export async function deleteChannelAction(channelId: string): Promise<ActionState> {
  const supabase = await createClient();

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
