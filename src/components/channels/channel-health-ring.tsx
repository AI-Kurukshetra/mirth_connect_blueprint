import { cn } from "@/lib/utils";
import { describeChannelHealth } from "@/lib/channels";

const colorMap = {
  critical: {
    glow: "shadow-[0_0_0_10px_rgba(207,106,65,0.08)]",
    stroke: "stroke-alert",
    text: "text-alert",
  },
  stable: {
    glow: "shadow-[0_0_0_10px_rgba(71,126,112,0.08)]",
    stroke: "stroke-teal",
    text: "text-teal",
  },
  watch: {
    glow: "shadow-[0_0_0_10px_rgba(201,148,72,0.08)]",
    stroke: "stroke-gold",
    text: "text-gold",
  },
} as const;

export function ChannelHealthRing({ score, size = "md" }: { score: number; size?: "md" | "lg" }) {
  const normalized = Math.max(0, Math.min(score, 100));
  const descriptor = describeChannelHealth(normalized);
  const radius = size === "lg" ? 46 : 34;
  const strokeWidth = size === "lg" ? 10 : 8;
  const viewport = size === "lg" ? 112 : 84;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;
  const colors = colorMap[descriptor.label];

  return (
    <div className={cn("relative inline-flex items-center justify-center rounded-full bg-white/70", colors.glow, size === "lg" ? "h-28 w-28" : "h-24 w-24")}>
      <svg className="-rotate-90" height={viewport} viewBox={`0 0 ${viewport} ${viewport}`} width={viewport}>
        <circle
          className="fill-none stroke-line/60"
          cx={viewport / 2}
          cy={viewport / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={cn("fill-none transition-all duration-500", colors.stroke)}
          cx={viewport / 2}
          cy={viewport / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-semibold tracking-[-0.04em]", colors.text)}>{normalized}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">health</span>
      </div>
    </div>
  );
}