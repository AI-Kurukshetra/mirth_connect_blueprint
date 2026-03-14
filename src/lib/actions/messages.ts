"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireRole } from "@/lib/authz";

async function writeAuditLog(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  userId: string | null,
  messageId: string,
  details: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "message.archived",
    entity_type: "message",
    entity_id: messageId,
    details,
  });
}

export async function archiveMessageAction(messageId: string): Promise<ActionState> {
  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { data: message, error: readError } = await access.supabase
    .from("messages")
    .select("id, message_id, status, channel_id, custom_metadata")
    .or(`id.eq.${messageId},message_id.eq.${messageId}`)
    .maybeSingle();

  if (readError || !message) {
    return { success: false, message: readError?.message ?? "Message not found." };
  }

  if (message.status === "archived") {
    return { success: true, message: `${message.message_id} is already archived.` };
  }

  const archivedAt = new Date().toISOString();
  const archiveReason = "Manual archive from operator console";
  const nextMetadata = {
    ...(message.custom_metadata ?? {}),
    archived: true,
    archivedAt,
    archivedBy: access.user?.id ?? null,
    archiveReason,
    previousStatus: message.status,
  };

  const { error: updateError } = await access.supabase
    .from("messages")
    .update({
      status: "archived",
      custom_metadata: nextMetadata,
    })
    .eq("id", message.id);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  await writeAuditLog(access.supabase, access.user?.id ?? null, message.message_id, {
    archivedAt,
    archivedBy: access.user?.id ?? null,
    previousStatus: message.status,
    channelId: message.channel_id,
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${messageId}`);
  revalidatePath(`/messages/${message.message_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/monitoring");
  revalidatePath("/audit");

  return {
    success: true,
    message: `${message.message_id} archived successfully.`,
  };
}