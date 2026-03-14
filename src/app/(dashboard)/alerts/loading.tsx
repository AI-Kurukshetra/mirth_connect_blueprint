import { Card } from "@/components/ui/card";

export default function AlertsLoading() {
  return (
    <div className="space-y-6">
      <Card className="h-52 animate-pulse bg-white/70" />
      <Card className="h-28 animate-pulse bg-white/70" />
      <div className="grid gap-4 2xl:grid-cols-2">
        <Card className="h-72 animate-pulse bg-white/70" />
        <Card className="h-72 animate-pulse bg-white/70" />
      </div>
    </div>
  );
}