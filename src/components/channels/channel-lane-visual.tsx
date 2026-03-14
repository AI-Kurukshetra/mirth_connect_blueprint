import { ArrowRight, Cable, Database, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ChannelLaneVisual({
  compact = false,
  destinationType,
  messageFormat,
  sourceType,
  status,
}: {
  compact?: boolean;
  destinationType: string;
  messageFormat: string;
  sourceType: string;
  status: "active" | "inactive" | "error" | "paused";
}) {
  return (
    <div className={cn("rounded-[26px] border border-line-strong bg-white/82", compact ? "p-3" : "p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Lane contour</p>
        <Badge tone={status === "active" ? "good" : status === "error" ? "warm" : status === "paused" ? "gold" : "neutral"}>{status}</Badge>
      </div>
      <div className={cn("mt-4 grid items-center gap-3", compact ? "md:grid-cols-[1fr_auto_1fr]" : "md:grid-cols-[1fr_auto_auto_1fr]")}>
        <div className="rounded-[20px] border border-line-strong bg-[#f8f4ec] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal/10 text-teal">
              <Cable className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Source</p>
              <p className="mt-1 text-sm font-semibold text-ink">{sourceType}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center text-teal">
          <ArrowRight className="h-5 w-5" />
        </div>
        {!compact ? (
          <div className="rounded-full border border-line-strong bg-white px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {messageFormat.replaceAll("_", " ")}
          </div>
        ) : null}
        <div className="rounded-[20px] border border-line-strong bg-[#f8f4ec] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/12 text-gold">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Destination</p>
              <p className="mt-1 text-sm font-semibold text-ink">{destinationType}</p>
            </div>
          </div>
        </div>
      </div>
      {!compact ? (
        <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-line-strong bg-[#f8f4ec] px-4 py-3 text-sm text-muted">
          <ShieldCheck className="h-4 w-4 text-teal" />
          <p>Operator posture stays visible here before you jump into the full designer.</p>
        </div>
      ) : null}
    </div>
  );
}