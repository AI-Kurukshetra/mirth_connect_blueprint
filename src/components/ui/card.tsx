import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-[30px] border border-white/60 shadow-[0_30px_90px_rgba(17,32,42,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

