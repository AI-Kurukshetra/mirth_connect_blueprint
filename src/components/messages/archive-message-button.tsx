"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { archiveMessageAction } from "@/lib/actions/messages";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";

export function ArchiveMessageButton({ messageId, variant = "danger" }: { messageId: string; variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      aria-label={`Archive ${messageId}`}
      loading={isPending}
      loadingText="Archiving message..."
      type="button"
      variant={variant}
      onClick={() => startTransition(async () => {
        startLoading(`Archiving ${messageId}...`);
        try {
          const result = await archiveMessageAction(messageId);
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
      Archive
    </Button>
  );
}