import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-30 w-full rounded-3xl border border-line-strong bg-white/80 px-4 py-3 text-sm text-ink outline-none",
        "placeholder:text-muted focus:border-mint focus:ring-2 focus:ring-mint/20",
        className,
      )}
      {...props}
    />
  );
}

