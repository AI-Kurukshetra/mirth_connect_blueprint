"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteChannelAction } from "@/lib/actions/channels";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";

export function DeleteChannelButton({ channelId }: { channelId: string }) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      aria-label="Delete channel"
      loading={isPending}
      loadingText="Deleting channel..."
      type="button"
      variant="danger"
      onClick={() => {
        if (!window.confirm(`Delete channel ${channelId}? This cannot be undone.`)) {
          return;
        }

        startTransition(async () => {
          startLoading("Deleting integration lane...");
          try {
            const result = await deleteChannelAction(channelId);
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success(result.message);
            router.push(result.redirectTo ?? "/channels");
            router.refresh();
          } finally {
            stopLoading();
          }
        });
      }}
    >
      Delete channel
    </Button>
  );
}
