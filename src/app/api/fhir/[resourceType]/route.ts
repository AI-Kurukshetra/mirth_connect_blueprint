import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import {
  buildFhirSearchBundle,
  prepareFhirResourceForCreate,
} from "@/lib/fhir/utils";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ resourceType: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { resourceType } = await context.params;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("_count") || "50", 10), 200);
    const offset = parseInt(searchParams.get("_offset") || "0", 10);
    const resourceId = searchParams.get("_id");
    const patientId = searchParams.get("patient");

    let query = supabase
      .from("fhir_resources")
      .select("resource_id, resource_data", { count: "exact" })
      .eq("resource_type", resourceType)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (resourceId) {
      query = query.eq("resource_id", resourceId);
    }

    if (patientId) {
      if (resourceType === "Patient") {
        query = query.eq("resource_id", patientId);
      } else {
        query = query.contains("resource_data", { subject: { reference: `Patient/${patientId}` } });
      }
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(buildFhirSearchBundle(resourceType, data || [], count || 0));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireRole(["admin", "engineer"]);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const { resourceType } = await context.params;
    const resource = await request.json() as Record<string, unknown>;

    if (resource.resourceType && resource.resourceType !== resourceType) {
      return NextResponse.json(
        { error: `Resource type mismatch: URL says "${resourceType}" but body says "${String(resource.resourceType)}"` },
        { status: 400 },
      );
    }

    const prepared = prepareFhirResourceForCreate(resourceType, resource);
    const { supabase } = access;

    const { data: existing } = await supabase
      .from("fhir_resources")
      .select("id")
      .eq("resource_type", resourceType)
      .eq("resource_id", prepared.resourceId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `${resourceType}/${prepared.resourceId} already exists.` },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("fhir_resources")
      .insert({
        resource_type: resourceType,
        resource_id: prepared.resourceId,
        version: prepared.version,
        resource_data: prepared.resourceData,
      })
      .select("resource_data")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data.resource_data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
