import { redirect } from "next/navigation";

import { TransformationForm } from "@/components/transformations/transformation-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";

export default async function AddTransformationPage() {
  const { permissions } = await getAuthContext();

  if (!permissions.canCreate) {
    redirect("/transformations");
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="gold">Create transformation</Badge>
        <h1 className="display-face mt-4 text-5xl text-ink">Stand up a new conversion runtime.</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Draft the script, declare the format bridge, and persist a versioned runtime that channel operators can assign safely.</p>
      </Card>
      <TransformationForm />
    </div>
  );
}
