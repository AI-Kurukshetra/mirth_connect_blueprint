import { ChannelForm } from "@/components/forms/channel-form";
import { Card } from "@/components/ui/card";

export default function AddChannelPage() {
  return (
    <Card className="p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Create channel</p>
      <h1 className="display-face mt-4 text-5xl text-ink">Provision a new integration lane.</h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-muted">This form validates on the client and the server, and shows both button and full-page loading feedback while the request is in flight.</p>
      <div className="mt-8 max-w-5xl"><ChannelForm /></div>
    </Card>
  );
}
