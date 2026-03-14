import { notFound, redirect } from "next/navigation";

import { ValidationRuleForm } from "@/components/validation-rules/validation-rule-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getValidationRules } from "@/lib/data/medflow";
import type { ValidationRuleInput } from "@/lib/validations/validation-rule";

export default async function EditValidationRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await getAuthContext();
  const [rules, channels] = await Promise.all([getValidationRules(), getChannels()]);
  const rule = rules.find((item) => item.rule_id === id || item.id === id) ?? null;

  if (!rule) {
    notFound();
  }

  if (!permissions.canEdit) {
    redirect("/validation-rules");
  }

  const assignedChannels = channels
    .filter((channel) => channel.validation_rule_id === rule.id)
    .map((channel) => ({ channelId: channel.channel_id, name: channel.name, status: channel.status }));

  const initialValues: ValidationRuleInput = {
    ruleId: rule.rule_id,
    name: rule.name,
    description: rule.description ?? "",
    messageFormat: rule.message_format,
    ruleType: rule.rule_type,
    severity: rule.severity,
    isActive: rule.is_active,
    ruleDefinition: JSON.stringify(rule.rule_definition, null, 2),
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone={rule.is_active ? "good" : "neutral"}>{rule.is_active ? "active rule" : "inactive rule"}</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Tune {rule.rule_id}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Adjust the enforcement contract, severity level, and JSON definition for this runtime validation gate.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={rule.severity === "error" ? "warm" : rule.severity === "warning" ? "gold" : "neutral"}>{rule.severity}</Badge>
            <Badge tone="neutral">{rule.rule_type.replaceAll("_", " ")}</Badge>
          </div>
        </div>
      </Card>
      <ValidationRuleForm assignedChannels={assignedChannels} currentRuleId={rule.rule_id} initialValues={initialValues} mode="edit" />
    </div>
  );
}
