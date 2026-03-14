import { NextRequest, NextResponse } from "next/server";
import { parseHL7, hl7ToJSON } from "@/lib/hl7/parser";
import { transformHL7ToFHIR } from "@/lib/hl7/transformer";
import { createClient } from "@/lib/supabase/server";

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
        { status: 400 }
      );
    }

    // Parse the HL7 message
    const parsed = parseHL7(hl7Raw);
    const parsedJSON = hl7ToJSON(parsed);

    // Transform to FHIR
    const result = transformHL7ToFHIR(parsed);

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
          messageType: result.messageType,
        },
        { status: 400 }
      );
    }

    // Save to Supabase
    const supabase = await createClient();

    // Log the message in the messages table
    const { error: msgError } = await supabase.from("messages").insert({
      message_type: result.messageType,
      raw_message: hl7Raw,
      parsed_data: parsedJSON,
      fhir_bundle: result.bundle,
      status: "transformed",
      direction: "inbound",
      source_system: parsedJSON.segments?.[0]?.fields?.[3]?.value || "unknown",
      destination_system: parsedJSON.segments?.[0]?.fields?.[5]?.value || "unknown",
    });

    if (msgError) {
      console.error("Failed to log message:", msgError);
    }

    // Save each FHIR resource
    const savedResources: Array<{ resourceType: string; id: string }> = [];
    for (const resource of result.resources) {
      const { error: resError } = await supabase.from("fhir_resources").insert({
        resource_type: resource.resourceType,
        resource_id: resource.id,
        resource_data: resource,
        source_message_type: result.messageType,
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
      { status: 500 }
    );
  }
}
