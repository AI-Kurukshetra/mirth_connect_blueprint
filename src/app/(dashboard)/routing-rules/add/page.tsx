import { redirect } from "next/navigation";

import { RoutingRuleForm } from "@/components/routing-rules/routing-rule-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getChannels } from "@/lib/data/medflow";

export default async function AddRoutingRulePage() {
  const { permissions } = await getAuthContext();
  const channels = await getChannels();

  if (!permissions.canCreate) {
    redirect("/routing-rules");
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="gold">Create routing rule</Badge>
        <h1 className="display-face mt-4 text-5xl text-ink">Stand up a new decision branch.</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Pick the source lane, condition logic, and action so MedFlow can route traffic along an explicit operational path.</p>
      </Card>
      <RoutingRuleForm channels={channels.map((channel) => ({ channelId: channel.channel_id, name: channel.name, status: channel.status }))} />
    </div>
  );
}
