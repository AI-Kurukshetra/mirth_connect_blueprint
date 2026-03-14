import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-line-strong bg-white/80 px-4 text-sm text-ink outline-none",
        "placeholder:text-muted focus:border-mint focus:ring-2 focus:ring-mint/20",
        className,
      )}
      {...props}
    />
  );
}

