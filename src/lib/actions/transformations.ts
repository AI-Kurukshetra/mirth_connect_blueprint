"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireRole } from "@/lib/authz";
import { transformationSchema, type TransformationInput } from "@/lib/validations/transformation";

function invalid(fieldErrors: Record<string, string[]>) {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
  } satisfies ActionState;
}

function toInsertRecord(input: TransformationInput, userId: string | null) {
  return {
    transformation_id: input.transformationId,
    name: input.name,
    description: input.description || null,
    language: input.language,
    input_format: input.inputFormat,
    output_format: input.outputFormat,
    version: input.version,
    is_active: input.isActive,
    script: input.script,
    created_by: userId,
  };
}

function toUpdateRecord(input: TransformationInput) {
  return {
    transformation_id: input.transformationId,
    name: input.name,
    description: input.description || null,
    language: input.language,
    input_format: input.inputFormat,
    output_format: input.outputFormat,
    version: input.version,
    is_active: input.isActive,
    script: input.script,
  };
}

export async function createTransformationAction(input: TransformationInput): Promise<ActionState> {
  const parsed = transformationSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase.from("transformations").insert(toInsertRecord(parsed.data, access.user?.id ?? null));

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/transformations");
  revalidatePath("/channels");

  return {
    success: true,
    message: "Transformation created successfully.",
    redirectTo: `/transformations/${parsed.data.transformationId}/edit`,
  };
}

export async function updateTransformationAction(currentTransformationId: string, input: TransformationInput): Promise<ActionState> {
  const parsed = transformationSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase
    .from("transformations")
    .update(toUpdateRecord(parsed.data))
    .eq("transformation_id", currentTransformationId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/transformations");
  revalidatePath(`/transformations/${currentTransformationId}/edit`);
  revalidatePath(`/transformations/${parsed.data.transformationId}/edit`);
  revalidatePath("/channels");

  return {
    success: true,
    message: "Transformation updated successfully.",
    redirectTo: `/transformations/${parsed.data.transformationId}/edit`,
  };
}

export async function deleteTransformationAction(transformationId: string): Promise<ActionState> {
  const access = await requireRole(["admin"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase.from("transformations").delete().eq("transformation_id", transformationId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/transformations");
  revalidatePath(`/transformations/${transformationId}/edit`);
  revalidatePath("/channels");

  return {
    success: true,
    message: "Transformation removed successfully.",
    redirectTo: "/transformations",
  };
}
