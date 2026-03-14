import { notFound, redirect } from "next/navigation";

import { RoutingRuleForm } from "@/components/routing-rules/routing-rule-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getRoutingRules } from "@/lib/data/medflow";
import type { RoutingRuleInput } from "@/lib/validations/routing-rule";

export default async function EditRoutingRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await getAuthContext();
  const [rules, channels] = await Promise.all([getRoutingRules(), getChannels()]);
  const rule = rules.find((item) => item.rule_id === id || item.id === id) ?? null;

  if (!rule) {
    notFound();
  }

  if (!permissions.canEdit) {
    redirect("/routing-rules");
  }

  const channelMap = new Map(channels.map((channel) => [channel.id, channel]));
  const sourceChannel = rule.channel_id ? channelMap.get(rule.channel_id) : null;
  const destinationChannel = rule.destination_channel_id ? channelMap.get(rule.destination_channel_id) : null;

  const initialValues: RoutingRuleInput = {
    ruleId: rule.rule_id,
    name: rule.name,
    description: rule.description ?? "",
    channelId: sourceChannel?.channel_id ?? "",
    priority: rule.priority,
    conditionType: rule.condition_type,
    conditionField: rule.condition_field ?? "",
    conditionOperator: rule.condition_operator ?? "equals",
    conditionValue: rule.condition_value ?? "",
    action: rule.action,
    destinationChannelId: destinationChannel?.channel_id ?? "",
    isActive: rule.is_active,
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone={rule.is_active ? "good" : "neutral"}>{rule.is_active ? "active route" : "inactive route"}</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Tune {rule.rule_id}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Adjust branch priority, conditions, and downstream action for this routing decision.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={rule.action === "route_to" ? "good" : rule.action === "archive" ? "warm" : rule.action === "filter" ? "gold" : "neutral"}>{rule.action.replaceAll("_", " ")}</Badge>
            <Badge tone="neutral">priority {rule.priority}</Badge>
          </div>
        </div>
      </Card>
      <RoutingRuleForm channels={channels.map((channel) => ({ channelId: channel.channel_id, name: channel.name, status: channel.status }))} currentRuleId={rule.rule_id} initialValues={initialValues} mode="edit" />
    </div>
  );
}
