import { redirect } from "next/navigation";

import { SimulatorForm } from "@/components/simulator/simulator-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getChannels } from "@/lib/data/medflow";

export default async function SimulatorPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { permissions } = await getAuthContext();
  const { channel } = await searchParams;

  if (!permissions.canCreate) {
    redirect("/messages");
  }

  const channels = (await getChannels()).filter((item) => item.status !== "inactive");

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="good">Message simulator</Badge>
        <h1 className="display-face mt-4 text-5xl text-ink">Send controlled test traffic through a live channel.</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">This simulator uses the same processing pipeline as the runtime APIs, then writes the generated message artifacts back into the message explorer for inspection.</p>
      </Card>

      <Card className="p-6 sm:p-8">
        <SimulatorForm channels={channels} initialChannelId={channel} />
      </Card>
    </div>
  );
}
