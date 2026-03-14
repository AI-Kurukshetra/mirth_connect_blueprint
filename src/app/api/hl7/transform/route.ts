import { NextRequest, NextResponse } from "next/server";

import { parseHL7, hl7ToJSON } from "@/lib/hl7/parser";
import { transformHL7ToFHIR } from "@/lib/hl7/transformer";
import { requireRole } from "@/lib/authz";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    let hl7Raw: string;

    try {
      const json = JSON.parse(body);
      hl7Raw = json.message || json.hl7 || json.raw || body;
    } catch {
      hl7Raw = body;
    }

    if (!hl7Raw || !hl7Raw.trim()) {
      return NextResponse.json(
        { error: "No HL7 message provided" },
        { status: 400 },
      );
    }

    const parsed = parseHL7(hl7Raw);
    const parsedJSON = hl7ToJSON(parsed);

    const result = transformHL7ToFHIR(parsed);

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
          messageType: result.messageType,
        },
        { status: 400 },
      );
    }

    const access = await requireRole(["admin", "engineer"]);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const { supabase } = access;
    const sourceSystem = parsedJSON.segments?.[0]?.fields?.[3]?.value || "unknown";
    const destinationSystem = parsedJSON.segments?.[0]?.fields?.[5]?.value || "unknown";
    const messageId = `MSG-${crypto.randomUUID()}`;

    const { data: savedMessage, error: msgError } = await supabase
      .from("messages")
      .insert({
        message_id: messageId,
        message_type: result.messageType,
        message_format: "HL7v2",
        status: result.resources.length > 0 ? "transformed" : "failed",
        direction: "inbound",
        data_type: "HL7V2",
        connector_name: "HL7 Transform API",
        source_system: sourceSystem,
        destination_system: destinationSystem,
        raw_payload: hl7Raw,
        transformed_payload: JSON.stringify(result.bundle),
        raw_content: hl7Raw,
        transformed_content: JSON.stringify(result.bundle),
        error_content: result.errors.length > 0 ? result.errors.join("; ") : null,
        custom_metadata: {
          parsed: parsedJSON,
          savedFrom: "api/hl7/transform",
        },
      })
      .select("id")
      .single();

    if (msgError) {
      console.error("Failed to log message:", msgError);
    }

    const savedResources: Array<{ resourceType: string; id: string }> = [];
    for (const resource of result.resources) {
      const { error: resError } = await supabase.from("fhir_resources").insert({
        resource_type: resource.resourceType,
        resource_id: resource.id,
        resource_data: resource,
        source_message_id: savedMessage?.id ?? null,
      });

      if (resError) {
        console.error(`Failed to save ${resource.resourceType}:`, resError);
      } else {
        savedResources.push({
          resourceType: resource.resourceType,
          id: resource.id!,
        });
      }
    }

    return NextResponse.json({
      success: true,
      messageType: result.messageType,
      bundle: result.bundle,
      resources: result.resources,
      savedResources,
      errors: result.errors,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to transform HL7 message",
      },
      { status: 500 },
    );
  }
}
