"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resolveErrorLogAction } from "@/lib/actions/errors";
import { useUiStore } from "@/store/ui-store";

export function ResolveErrorButton({ errorCode, errorId }: { errorCode: string; errorId: string }) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      aria-label={`Resolve ${errorCode}`}
      loading={isPending}
      loadingText="Resolving incident..."
      type="button"
      variant="primary"
      onClick={() => startTransition(async () => {
        startLoading(`Resolving ${errorCode} incident...`);
        try {
          const result = await resolveErrorLogAction(errorId);
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
      Mark resolved
    </Button>
  );
}