import { redirect } from "next/navigation";

import { ValidationRuleForm } from "@/components/validation-rules/validation-rule-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";

export default async function AddValidationRulePage() {
  const { permissions } = await getAuthContext();

  if (!permissions.canCreate) {
    redirect("/validation-rules");
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="gold">Create validation rule</Badge>
        <h1 className="display-face mt-4 text-5xl text-ink">Stand up a new payload gate.</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Declare the message contract, severity posture, and JSON definition the runtime will evaluate before routing continues.</p>
      </Card>
      <ValidationRuleForm />
    </div>
  );
}
