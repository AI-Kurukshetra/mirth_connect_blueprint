"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { channelSchema, type ChannelInput } from "@/lib/validations/channel";

import type { ActionState } from "@/lib/actions/auth";

export async function createChannelAction(input: ChannelInput): Promise<ActionState> {
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
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
    retry_interval: 60,
    status: "active",
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

