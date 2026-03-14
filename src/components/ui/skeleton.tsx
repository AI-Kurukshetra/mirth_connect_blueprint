import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("page-loader-shimmer rounded-3xl bg-ink/6", className)} />;
}

