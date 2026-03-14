import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";

export function StatsCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(236,245,240,0.78))] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="display-face mt-4 text-5xl leading-none text-ink">{value}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-mint/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal">
            <ArrowUpRight className="h-4 w-4" />
            Live
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm leading-6 text-muted">{detail}</p>
      </div>
    </Card>
  );
}