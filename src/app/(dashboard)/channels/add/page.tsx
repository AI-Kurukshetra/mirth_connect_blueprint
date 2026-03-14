import { redirect } from "next/navigation";

import { ChannelForm } from "@/components/forms/channel-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";

export default async function AddChannelPage() {
  const { permissions } = await getAuthContext();

  if (!permissions.canCreate) {
    redirect("/channels");
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="bg-[linear-gradient(145deg,rgba(10,24,32,0.98),rgba(15,72,80,0.94)_42%,rgba(147,168,94,0.9)_100%)] p-6 text-white sm:p-8">
          <Badge className="bg-white/10 text-white" tone="neutral">Create channel</Badge>
          <h1 className="display-face mt-4 text-5xl text-white">Provision a new integration lane with runtime posture visible before first save.</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">This surface validates on the client and the server, shows draft lane posture live, and sets the operator-facing route shape before you enter the full designer.</p>
        </div>
      </Card>
      <ChannelForm />
    </div>
  );
}