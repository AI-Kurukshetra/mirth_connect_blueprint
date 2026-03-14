"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireRole } from "@/lib/authz";

async function writeAuditLog(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  userId: string | null,
  errorId: string,
  details: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "error.resolved",
    entity_type: "error_log",
    entity_id: errorId,
    details,
  });
}

export async function resolveErrorLogAction(errorId: string): Promise<ActionState> {
  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { data: errorLog, error: readError } = await access.supabase
    .from("error_logs")
    .select("id, error_code, error_type, message_id, channel_id, resolved")
    .eq("id", errorId)
    .maybeSingle();

  if (readError || !errorLog) {
    return { success: false, message: readError?.message ?? "Error log not found." };
  }

  if (errorLog.resolved) {
    return { success: true, message: `${errorLog.error_code} is already resolved.` };
  }

  const resolvedAt = new Date().toISOString();
  const { error: updateError } = await access.supabase
    .from("error_logs")
    .update({
      resolved: true,
      resolved_at: resolvedAt,
      resolved_by: access.user?.id ?? null,
    })
    .eq("id", errorId);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  await writeAuditLog(access.supabase, access.user?.id ?? null, errorId, {
    error_code: errorLog.error_code,
    error_type: errorLog.error_type,
    channel_id: errorLog.channel_id,
    message_id: errorLog.message_id,
    resolved_at: resolvedAt,
  });

  revalidatePath("/errors");
  revalidatePath("/monitoring");
  revalidatePath("/audit");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `${errorLog.error_code} marked as resolved.`,
  };
}