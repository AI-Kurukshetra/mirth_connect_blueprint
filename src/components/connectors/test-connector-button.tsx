"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { testConnectorAction } from "@/lib/actions/connectors";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";

interface TestConnectorButtonProps {
  connectorId: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export function TestConnectorButton({ connectorId, variant = "secondary" }: TestConnectorButtonProps) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      aria-label={`Test ${connectorId}`}
      loading={isPending}
      loadingText="Testing connector..."
      type="button"
      variant={variant}
      onClick={() => startTransition(async () => {
        startLoading(`Testing ${connectorId} endpoint...`);
        try {
          const result = await testConnectorAction(connectorId);
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
      Test connector
    </Button>
  );
}