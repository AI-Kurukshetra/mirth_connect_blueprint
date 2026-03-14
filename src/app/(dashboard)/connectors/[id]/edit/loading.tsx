import { Card } from "@/components/ui/card";

export default function EditConnectorLoading() {
  return (
    <div className="space-y-6">
      <Card className="h-32 animate-pulse bg-white/70" />
      <Card className="h-[680px] animate-pulse bg-white/70" />
    </div>
  );
}