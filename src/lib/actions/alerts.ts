"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireRole } from "@/lib/authz";
import { alertSchema, type AlertInput } from "@/lib/validations/alert";

function invalid(fieldErrors: Record<string, string[]>) {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
  } satisfies ActionState;
}

function toInsertRecord(input: AlertInput, userId: string | null) {
  return {
    alert_id: input.alertId,
    name: input.name,
    description: input.description || null,
    trigger_type: input.triggerType,
    threshold_value: Number.isNaN(input.thresholdValue) ? null : input.thresholdValue,
    threshold_operator: input.thresholdOperator,
    notification_channel: input.notificationChannel,
    notification_target: input.notificationTarget,
    cooldown_minutes: input.cooldownMinutes,
    is_active: input.isActive,
    created_by: userId,
  };
}

function toUpdateRecord(input: AlertInput) {
  return {
    alert_id: input.alertId,
    name: input.name,
    description: input.description || null,
    trigger_type: input.triggerType,
    threshold_value: Number.isNaN(input.thresholdValue) ? null : input.thresholdValue,
    threshold_operator: input.thresholdOperator,
    notification_channel: input.notificationChannel,
    notification_target: input.notificationTarget,
    cooldown_minutes: input.cooldownMinutes,
    is_active: input.isActive,
  };
}

async function writeAuditLog(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  userId: string | null,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    entity_type: "alert",
    entity_id: entityId,
    details,
  });
}

export async function createAlertAction(input: AlertInput): Promise<ActionState> {
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase.from("alerts").insert(toInsertRecord(parsed.data, access.user?.id ?? null));
  if (error) {
    return { success: false, message: error.message };
  }

  await writeAuditLog(access.supabase, access.user?.id ?? null, "alert.created", parsed.data.alertId, {
    trigger_type: parsed.data.triggerType,
    notification_channel: parsed.data.notificationChannel,
  });

  revalidatePath("/alerts");
  revalidatePath("/audit");

  return {
    success: true,
    message: "Alert created successfully.",
    redirectTo: `/alerts/${parsed.data.alertId}/edit`,
  };
}

export async function updateAlertAction(currentAlertId: string, input: AlertInput): Promise<ActionState> {
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase
    .from("alerts")
    .update(toUpdateRecord(parsed.data))
    .eq("alert_id", currentAlertId);

  if (error) {
    return { success: false, message: error.message };
  }

  await writeAuditLog(access.supabase, access.user?.id ?? null, "alert.updated", parsed.data.alertId, {
    previous_alert_id: currentAlertId,
    trigger_type: parsed.data.triggerType,
    is_active: parsed.data.isActive,
  });

  revalidatePath("/alerts");
  revalidatePath(`/alerts/${currentAlertId}/edit`);
  revalidatePath(`/alerts/${parsed.data.alertId}/edit`);
  revalidatePath("/audit");

  return {
    success: true,
    message: "Alert updated successfully.",
    redirectTo: `/alerts/${parsed.data.alertId}/edit`,
  };
}

export async function triggerAlertTestAction(alertId: string): Promise<ActionState> {
  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { data: alert, error: alertError } = await access.supabase
    .from("alerts")
    .select("id, alert_id, name, threshold_value, notification_channel, notification_target, trigger_count")
    .eq("alert_id", alertId)
    .maybeSingle();

  if (alertError || !alert) {
    return { success: false, message: alertError?.message ?? "Alert not found." };
  }

  const timestamp = new Date().toISOString();
  const triggerValue = typeof alert.threshold_value === "number" ? Number(alert.threshold_value) + 1 : 1;
  const historyMessage = `Manual trigger simulation delivered through ${alert.notification_channel} to ${alert.notification_target}.`;

  const { error: updateError } = await access.supabase
    .from("alerts")
    .update({
      last_triggered: timestamp,
      trigger_count: (alert.trigger_count ?? 0) + 1,
    })
    .eq("alert_id", alertId);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  const { error: historyError } = await access.supabase.from("alert_history").insert({
    alert_id: alert.id,
    triggered_at: timestamp,
    trigger_value: triggerValue,
    message: historyMessage,
    notified: true,
    notified_at: timestamp,
  });

  if (historyError) {
    return { success: false, message: historyError.message };
  }

  await writeAuditLog(access.supabase, access.user?.id ?? null, "alert.tested", alert.alert_id, {
    notification_channel: alert.notification_channel,
    trigger_value: triggerValue,
    simulated: true,
  });

  revalidatePath("/alerts");
  revalidatePath(`/alerts/${alertId}/edit`);
  revalidatePath("/audit");

  return {
    success: true,
    message: `Simulated trigger for ${alert.name} delivered successfully.`,
  };
}