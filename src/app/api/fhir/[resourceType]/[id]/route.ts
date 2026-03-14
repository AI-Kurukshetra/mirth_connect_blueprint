import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { prepareFhirResourceForUpdate } from "@/lib/fhir/utils";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; id: string }> },
) {
  const { resourceType, id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fhir_resources")
    .select("resource_data")
    .eq("resource_type", resourceType)
    .eq("resource_id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: `${resourceType}/${id} not found` }, { status: 404 });
  }

  return NextResponse.json(data.resource_data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; id: string }> },
) {
  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { resourceType, id } = await params;
  const { supabase } = access;
  const resource = await request.json() as Record<string, unknown>;

  if (resource.resourceType && resource.resourceType !== resourceType) {
    return NextResponse.json(
      { error: `Resource type mismatch: URL says "${resourceType}" but body says "${String(resource.resourceType)}"` },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("fhir_resources")
    .select("version")
    .eq("resource_type", resourceType)
    .eq("resource_id", id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: `${resourceType}/${id} not found` }, { status: 404 });
  }

  const prepared = prepareFhirResourceForUpdate(resourceType, id, resource, existing.version);

  const { data, error } = await supabase
    .from("fhir_resources")
    .update({
      resource_data: prepared.resourceData,
      version: prepared.version,
    })
    .eq("resource_type", resourceType)
    .eq("resource_id", id)
    .select("resource_data")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data.resource_data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; id: string }> },
) {
  const access = await requireRole(["admin", "engineer"]);
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { resourceType, id } = await params;
  const { supabase } = access;

  const { error } = await supabase
    .from("fhir_resources")
    .delete()
    .eq("resource_type", resourceType)
    .eq("resource_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Deleted" }, { status: 200 });
}
