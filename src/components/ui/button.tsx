import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:-translate-y-0.5 hover:bg-teal shadow-[0_18px_40px_rgba(17,32,42,0.18)]",
  secondary: "border border-line-strong bg-white/78 text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-alert text-white hover:-translate-y-0.5 hover:bg-[#eb6f40]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  children,
  className,
  loading = false,
  loadingText = "Working...",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold",
        "disabled:cursor-not-allowed disabled:opacity-70",
        variants[variant],
        className,
      )}
      disabled={loading || props.disabled}
      type={type}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {loading ? loadingText : children}
    </button>
  );
}

