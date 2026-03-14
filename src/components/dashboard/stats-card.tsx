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
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-5 flex items-end justify-between gap-4">
        <p className="display-face text-5xl leading-none text-ink">{value}</p>
        <div className="flex items-center gap-1 rounded-full bg-mint/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal">
          <ArrowUpRight className="h-4 w-4" />
          Live
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{detail}</p>
    </Card>
  );
}

