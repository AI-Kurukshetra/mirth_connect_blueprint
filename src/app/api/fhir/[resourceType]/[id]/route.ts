import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; id: string }> }
) {
  const { resourceType, id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fhir_resources")
    .select("*")
    .eq("resource_type", resourceType)
    .eq("resource_id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: `${resourceType}/${id} not found` }, { status: 404 });
  }

  return NextResponse.json(data.resource);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; id: string }> }
) {
  const { resourceType, id } = await params;
  const supabase = await createClient();
  const resource = await request.json();

  const { data, error } = await supabase
    .from("fhir_resources")
    .update({ resource, version: resource.meta?.versionId || 1, updated_at: new Date().toISOString() })
    .eq("resource_type", resourceType)
    .eq("resource_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data.resource);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; id: string }> }
) {
  const { resourceType, id } = await params;
  const supabase = await createClient();

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
