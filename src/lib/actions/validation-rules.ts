"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireRole } from "@/lib/authz";
import { validationRuleSchema, type ValidationRuleInput } from "@/lib/validations/validation-rule";

function invalid(fieldErrors: Record<string, string[]>) {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
  } satisfies ActionState;
}

function parseDefinition(ruleDefinition: string) {
  return JSON.parse(ruleDefinition) as Record<string, unknown>;
}

function toInsertRecord(input: ValidationRuleInput, userId: string | null) {
  return {
    rule_id: input.ruleId,
    name: input.name,
    description: input.description || null,
    message_format: input.messageFormat,
    rule_type: input.ruleType,
    rule_definition: parseDefinition(input.ruleDefinition),
    severity: input.severity,
    is_active: input.isActive,
    created_by: userId,
  };
}

function toUpdateRecord(input: ValidationRuleInput) {
  return {
    rule_id: input.ruleId,
    name: input.name,
    description: input.description || null,
    message_format: input.messageFormat,
    rule_type: input.ruleType,
    rule_definition: parseDefinition(input.ruleDefinition),
    severity: input.severity,
    is_active: input.isActive,
  };
}

export async function createValidationRuleAction(input: ValidationRuleInput): Promise<ActionState> {
  const parsed = validationRuleSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase.from("validation_rules").insert(toInsertRecord(parsed.data, access.user?.id ?? null));
  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/validation-rules");
  revalidatePath("/channels");

  return {
    success: true,
    message: "Validation rule created successfully.",
    redirectTo: `/validation-rules/${parsed.data.ruleId}/edit`,
  };
}

export async function updateValidationRuleAction(currentRuleId: string, input: ValidationRuleInput): Promise<ActionState> {
  const parsed = validationRuleSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase
    .from("validation_rules")
    .update(toUpdateRecord(parsed.data))
    .eq("rule_id", currentRuleId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/validation-rules");
  revalidatePath(`/validation-rules/${currentRuleId}/edit`);
  revalidatePath(`/validation-rules/${parsed.data.ruleId}/edit`);
  revalidatePath("/channels");

  return {
    success: true,
    message: "Validation rule updated successfully.",
    redirectTo: `/validation-rules/${parsed.data.ruleId}/edit`,
  };
}

export async function deleteValidationRuleAction(ruleId: string): Promise<ActionState> {
  const access = await requireRole(["admin"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase.from("validation_rules").delete().eq("rule_id", ruleId);
  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/validation-rules");
  revalidatePath(`/validation-rules/${ruleId}/edit`);
  revalidatePath("/channels");

  return {
    success: true,
    message: "Validation rule removed successfully.",
    redirectTo: "/validation-rules",
  };
}
