import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ resourceType: string }> };

/** GET /api/fhir/:resourceType - Search FHIR resources by type */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { resourceType } = await context.params;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("_count") || "50", 10);
    const offset = parseInt(searchParams.get("_offset") || "0", 10);

    let query = supabase
      .from("fhir_resources")
      .select("*", { count: "exact" })
      .eq("resource_type", resourceType)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Support basic search parameters
    const patientId = searchParams.get("patient");
    if (patientId) {
      query = query.contains("resource_data", { subject: { reference: `Patient/${patientId}` } });
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return as a FHIR-like searchset Bundle
    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: count || 0,
      entry: (data || []).map((row: { resource_data: unknown; resource_id: string }) => ({
        fullUrl: `/fhir/${resourceType}/${row.resource_id}`,
        resource: row.resource_data,
      })),
    };

    return NextResponse.json(bundle);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/** POST /api/fhir/:resourceType - Create a new FHIR resource */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { resourceType } = await context.params;
    const resource = await request.json();

    if (resource.resourceType && resource.resourceType !== resourceType) {
      return NextResponse.json(
        { error: `Resource type mismatch: URL says "${resourceType}" but body says "${resource.resourceType}"` },
        { status: 400 }
      );
    }

    // Ensure the resource has an ID
    if (!resource.id) {
      resource.id = crypto.randomUUID();
    }
    resource.resourceType = resourceType;
    resource.meta = {
      ...resource.meta,
      lastUpdated: new Date().toISOString(),
      versionId: "1",
    };

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("fhir_resources")
      .insert({
        resource_type: resourceType,
        resource_id: resource.id,
        resource_data: resource,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data.resource_data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
