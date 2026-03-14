"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireRole } from "@/lib/authz";
import { connectorSchema, type ConnectorInput } from "@/lib/validations/connector";

function invalid(fieldErrors: Record<string, string[]>) {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
  } satisfies ActionState;
}

function toInsertRecord(input: ConnectorInput, userId: string | null) {
  return {
    connector_id: input.connectorId,
    name: input.name,
    type: input.type,
    direction: input.direction,
    host: input.host || null,
    port: Number.isNaN(input.port) ? null : input.port,
    path_or_queue: input.pathOrQueue || null,
    auth_method: input.authMethod,
    status: input.status,
    created_by: userId,
  };
}

function toUpdateRecord(input: ConnectorInput) {
  return {
    connector_id: input.connectorId,
    name: input.name,
    type: input.type,
    direction: input.direction,
    host: input.host || null,
    port: Number.isNaN(input.port) ? null : input.port,
    path_or_queue: input.pathOrQueue || null,
    auth_method: input.authMethod,
    status: input.status,
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
    entity_type: "connector",
    entity_id: entityId,
    details,
  });
}

export async function createConnectorAction(input: ConnectorInput): Promise<ActionState> {
  const parsed = connectorSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase.from("connectors").insert(toInsertRecord(parsed.data, access.user?.id ?? null));

  if (error) {
    return { success: false, message: error.message };
  }

  await writeAuditLog(access.supabase, access.user?.id ?? null, "connector.created", parsed.data.connectorId, {
    type: parsed.data.type,
    direction: parsed.data.direction,
  });

  revalidatePath("/connectors");
  revalidatePath("/audit");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Connector created successfully.",
    redirectTo: `/connectors/${parsed.data.connectorId}/edit`,
  };
}

export async function updateConnectorAction(currentConnectorId: string, input: ConnectorInput): Promise<ActionState> {
  const parsed = connectorSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { error } = await access.supabase
    .from("connectors")
    .update(toUpdateRecord(parsed.data))
    .eq("connector_id", currentConnectorId);

  if (error) {
    return { success: false, message: error.message };
  }

  await writeAuditLog(access.supabase, access.user?.id ?? null, "connector.updated", parsed.data.connectorId, {
    previous_connector_id: currentConnectorId,
    type: parsed.data.type,
    status: parsed.data.status,
  });

  revalidatePath("/connectors");
  revalidatePath(`/connectors/${currentConnectorId}/edit`);
  revalidatePath(`/connectors/${parsed.data.connectorId}/edit`);
  revalidatePath("/audit");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Connector updated successfully.",
    redirectTo: `/connectors/${parsed.data.connectorId}/edit`,
  };
}

function simulateConnectorTest(input: {
  type: string;
  host: string | null;
  port: number | null;
  path_or_queue: string | null;
}) {
  const host = input.host?.trim().toLowerCase() ?? "";
  const failureHints = ["offline", "down", "error", "invalid", "refused", "fail"];

  if (input.type === "File" && !input.path_or_queue) {
    return { status: "error" as const, message: "File connectors require a path or queue name before testing." };
  }

  if (input.type !== "File" && !input.host) {
    return { status: "error" as const, message: "Connector host is missing. Add a reachable endpoint before testing." };
  }

  if (input.port !== null && (input.port < 1 || input.port > 65535)) {
    return { status: "error" as const, message: "Connector port is outside the valid network range." };
  }

  if (failureHints.some((hint) => host.includes(hint))) {
    return { status: "error" as const, message: "Simulated probe detected an unreachable endpoint." };
  }

  return { status: "connected" as const, message: "Connector probe completed successfully." };
}

export async function testConnectorAction(connectorId: string): Promise<ActionState> {
  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const { data: connector, error: readError } = await access.supabase
    .from("connectors")
    .select("connector_id, type, host, port, path_or_queue")
    .eq("connector_id", connectorId)
    .maybeSingle();

  if (readError || !connector) {
    return { success: false, message: readError?.message ?? "Connector not found." };
  }

  const result = simulateConnectorTest(connector);
  const timestamp = new Date().toISOString();

  const { error } = await access.supabase
    .from("connectors")
    .update({
      status: result.status,
      last_ping: timestamp,
    })
    .eq("connector_id", connectorId);

  if (error) {
    return { success: false, message: error.message };
  }

  await writeAuditLog(access.supabase, access.user?.id ?? null, "connector.tested", connectorId, {
    simulated: true,
    result: result.status,
    timestamp,
  });

  revalidatePath("/connectors");
  revalidatePath(`/connectors/${connectorId}/edit`);
  revalidatePath("/audit");
  revalidatePath("/dashboard");

  return {
    success: result.status === "connected",
    message: result.message,
  };
}