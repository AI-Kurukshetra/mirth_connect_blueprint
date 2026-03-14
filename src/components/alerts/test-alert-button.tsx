"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { triggerAlertTestAction } from "@/lib/actions/alerts";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";

export function TestAlertButton({ alertId, variant = "secondary" }: { alertId: string; variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      aria-label={`Test ${alertId}`}
      loading={isPending}
      loadingText="Triggering alert..."
      type="button"
      variant={variant}
      onClick={() => startTransition(async () => {
        startLoading(`Simulating ${alertId} delivery...`);
        try {
          const result = await triggerAlertTestAction(alertId);
          if (result.success) {
            toast.success(result.message);
          } else {
            toast.error(result.message);
          }
          router.refresh();
        } finally {
          stopLoading();
        }
      })}
    >
      Test alert
    </Button>
  );
}