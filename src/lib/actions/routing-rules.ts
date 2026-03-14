"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireRole } from "@/lib/authz";
import { routingRuleSchema, type RoutingRuleInput } from "@/lib/validations/routing-rule";

function invalid(fieldErrors: Record<string, string[]>) {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
  } satisfies ActionState;
}

async function resolveChannelIds(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"], sourceChannelId: string, destinationChannelId: string) {
  const ids = [sourceChannelId, destinationChannelId].filter(Boolean);
  const { data, error } = await supabase.from("channels").select("id, channel_id").in("channel_id", ids);

  if (error) {
    return { error: error.message, sourceId: null, destinationId: null };
  }

  const idMap = new Map((data ?? []).map((row) => [row.channel_id, row.id]));
  return {
    error: null,
    sourceId: idMap.get(sourceChannelId) ?? null,
    destinationId: destinationChannelId ? (idMap.get(destinationChannelId) ?? null) : null,
  };
}

function toInsertRecord(input: RoutingRuleInput, sourceId: string, destinationId: string | null, userId: string | null) {
  return {
    rule_id: input.ruleId,
    name: input.name,
    description: input.description || null,
    channel_id: sourceId,
    priority: input.priority,
    condition_type: input.conditionType,
    condition_field: input.conditionField || null,
    condition_operator: input.conditionOperator,
    condition_value: input.conditionOperator === "exists" ? null : (input.conditionValue || null),
    action: input.action,
    destination_channel_id: destinationId,
    is_active: input.isActive,
    created_by: userId,
  };
}

function toUpdateRecord(input: RoutingRuleInput, sourceId: string, destinationId: string | null) {
  return {
    rule_id: input.ruleId,
    name: input.name,
    description: input.description || null,
    channel_id: sourceId,
    priority: input.priority,
    condition_type: input.conditionType,
    condition_field: input.conditionField || null,
    condition_operator: input.conditionOperator,
    condition_value: input.conditionOperator === "exists" ? null : (input.conditionValue || null),
    action: input.action,
    destination_channel_id: destinationId,
    is_active: input.isActive,
  };
}

export async function createRoutingRuleAction(input: RoutingRuleInput): Promise<ActionState> {
  const parsed = routingRuleSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error: resolveError, sourceId, destinationId } = await resolveChannelIds(access.supabase, parsed.data.channelId, parsed.data.destinationChannelId);
  if (resolveError || !sourceId) {
    return { success: false, message: resolveError ?? "Unable to resolve the source channel." };
  }
  if (parsed.data.destinationChannelId && !destinationId) {
    return { success: false, message: "Unable to resolve the destination channel." };
  }

  const { error } = await access.supabase.from("routing_rules").insert(toInsertRecord(parsed.data, sourceId, destinationId, access.user?.id ?? null));
  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/routing-rules");
  revalidatePath("/channels");

  return {
    success: true,
    message: "Routing rule created successfully.",
    redirectTo: `/routing-rules/${parsed.data.ruleId}/edit`,
  };
}

export async function updateRoutingRuleAction(currentRuleId: string, input: RoutingRuleInput): Promise<ActionState> {
  const parsed = routingRuleSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error: resolveError, sourceId, destinationId } = await resolveChannelIds(access.supabase, parsed.data.channelId, parsed.data.destinationChannelId);
  if (resolveError || !sourceId) {
    return { success: false, message: resolveError ?? "Unable to resolve the source channel." };
  }
  if (parsed.data.destinationChannelId && !destinationId) {
    return { success: false, message: "Unable to resolve the destination channel." };
  }

  const { error } = await access.supabase
    .from("routing_rules")
    .update(toUpdateRecord(parsed.data, sourceId, destinationId))
    .eq("rule_id", currentRuleId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/routing-rules");
  revalidatePath(`/routing-rules/${currentRuleId}/edit`);
  revalidatePath(`/routing-rules/${parsed.data.ruleId}/edit`);
  revalidatePath("/channels");

  return {
    success: true,
    message: "Routing rule updated successfully.",
    redirectTo: `/routing-rules/${parsed.data.ruleId}/edit`,
  };
}

export async function deleteRoutingRuleAction(ruleId: string): Promise<ActionState> {
  const access = await requireRole(["admin"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase.from("routing_rules").delete().eq("rule_id", ruleId);
  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/routing-rules");
  revalidatePath(`/routing-rules/${ruleId}/edit`);
  revalidatePath("/channels");

  return {
    success: true,
    message: "Routing rule removed successfully.",
    redirectTo: "/routing-rules",
  };
}
