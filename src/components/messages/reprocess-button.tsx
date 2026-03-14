"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";

export function ReprocessButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      aria-label="Reprocess message"
      loading={isPending}
      loadingText="Reprocessing..."
      type="button"
      variant="secondary"
      onClick={() => startTransition(async () => {
        startLoading("Reprocessing message...");
        try {
          const response = await fetch(`/api/messages/${messageId}/reprocess`, {
            method: "POST",
          });
          const data = await response.json();

          if (!response.ok) {
            toast.error(data.error || "Failed to reprocess message.");
            return;
          }

          toast.success("Message reprocessed successfully.");

          if (data.result?.messageId) {
            router.push(`/messages/${data.result.messageId}`);
          } else {
            router.refresh();
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to reprocess message.");
        } finally {
          stopLoading();
        }
      })}
    >
      Reprocess
    </Button>
  );
}
