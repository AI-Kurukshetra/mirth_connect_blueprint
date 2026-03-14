import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-ink/7 text-ink",
  good: "bg-mint/16 text-teal",
  warm: "bg-alert/14 text-alert",
  gold: "bg-gold/16 text-gold",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

