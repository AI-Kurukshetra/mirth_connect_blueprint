import { notFound, redirect } from "next/navigation";

import { TransformationForm } from "@/components/transformations/transformation-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getTransformations } from "@/lib/data/medflow";
import type { TransformationInput } from "@/lib/validations/transformation";

export default async function EditTransformationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await getAuthContext();
  const [transformations, channels] = await Promise.all([getTransformations(), getChannels()]);
  const transformation = transformations.find((item) => item.transformation_id === id || item.id === id) ?? null;

  if (!transformation) {
    notFound();
  }

  if (!permissions.canEdit) {
    redirect("/transformations");
  }

  const assignedChannels = channels
    .filter((channel) => channel.transformation_id === transformation.id)
    .map((channel) => ({ channelId: channel.channel_id, name: channel.name, status: channel.status }));

  const initialValues: TransformationInput = {
    transformationId: transformation.transformation_id,
    name: transformation.name,
    description: transformation.description ?? "",
    language: transformation.language,
    inputFormat: transformation.input_format ?? "HL7v2",
    outputFormat: transformation.output_format ?? "FHIR_R4",
    version: transformation.version,
    isActive: transformation.is_active,
    script: transformation.script,
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone={transformation.is_active ? "good" : "neutral"}>{transformation.is_active ? "active runtime" : "inactive runtime"}</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Tune {transformation.transformation_id}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Adjust the active script, update version metadata, and keep linked channels aligned with the runtime contract.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="gold">v{transformation.version}</Badge>
            <Badge tone={transformation.test_result === "pass" ? "good" : transformation.test_result === "fail" ? "warm" : "neutral"}>{transformation.test_result ?? "untested"}</Badge>
          </div>
        </div>
      </Card>
      <TransformationForm assignedChannels={assignedChannels} currentTransformationId={transformation.transformation_id} initialValues={initialValues} mode="edit" />
    </div>
  );
}
