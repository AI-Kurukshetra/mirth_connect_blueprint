"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createChannelAction, updateChannelAction } from "@/lib/actions/channels";
import { channelSchema, type ChannelInput } from "@/lib/validations/channel";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ChannelFormProps {
  mode?: "create" | "edit";
  currentChannelId?: string;
  initialValues?: ChannelInput;
}

const defaultValues: ChannelInput = {
  channelId: "CH-009",
  name: "",
  description: "",
  sourceType: "MLLP",
  destinationType: "REST",
  messageFormat: "HL7v2",
  retryCount: 3,
  retryInterval: 60,
  status: "active",
};

export function ChannelForm({ mode = "create", currentChannelId, initialValues }: ChannelFormProps) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChannelInput>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(channelSchema),
  });

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading(mode === "create" ? "Provisioning integration lane..." : "Updating integration lane...");
      try {
        const result = mode === "edit" && currentChannelId
          ? await updateChannelAction(currentChannelId, values)
          : await createChannelAction(values);

        setServerMessage(result.message);
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
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="channelId">Channel ID</label>
          <Input aria-label="Channel ID" id="channelId" {...register("channelId")} />
          {errors.channelId ? <p className="text-sm text-alert">{errors.channelId.message}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="channelName">Name</label>
          <Input aria-label="Channel name" id="channelName" {...register("name")} />
          {errors.name ? <p className="text-sm text-alert">{errors.name.message}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-ink" htmlFor="description">Operational description</label>
        <Textarea aria-label="Operational description" id="description" {...register("description")} />
        {errors.description ? <p className="text-sm text-alert">{errors.description.message}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="sourceType">Source</label>
          <Select aria-label="Source type" id="sourceType" {...register("sourceType")}>
            <option value="MLLP">MLLP</option>
            <option value="HTTP">HTTP</option>
            <option value="SFTP">SFTP</option>
            <option value="TCP">TCP</option>
            <option value="REST">REST</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="destinationType">Destination</label>
          <Select aria-label="Destination type" id="destinationType" {...register("destinationType")}>
            <option value="Database">Database</option>
            <option value="HTTP">HTTP</option>
            <option value="REST">REST</option>
            <option value="SFTP">SFTP</option>
            <option value="TCP">TCP</option>
            <option value="MLLP">MLLP</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="messageFormat">Format</label>
          <Select aria-label="Message format" id="messageFormat" {...register("messageFormat")}>
            <option value="HL7v2">HL7v2</option>
            <option value="HL7v3">HL7v3</option>
            <option value="FHIR_R4">FHIR R4</option>
            <option value="FHIR_R5">FHIR R5</option>
            <option value="JSON">JSON</option>
            <option value="XML">XML</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="retryCount">Retries</label>
          <Input aria-label="Retry count" id="retryCount" type="number" {...register("retryCount", { valueAsNumber: true })} />
          {errors.retryCount ? <p className="text-sm text-alert">{errors.retryCount.message}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="retryInterval">Retry interval</label>
          <Input aria-label="Retry interval" id="retryInterval" type="number" {...register("retryInterval", { valueAsNumber: true })} />
          {errors.retryInterval ? <p className="text-sm text-alert">{errors.retryInterval.message}</p> : null}
        </div>
      </div>

      <div className="space-y-2 max-w-xs">
        <label className="text-sm font-semibold text-ink" htmlFor="status">Status</label>
        <Select aria-label="Channel status" id="status" {...register("status")}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="inactive">Inactive</option>
          <option value="error">Error</option>
        </Select>
      </div>

      {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : null}
      <Button aria-label={mode === "create" ? "Create channel" : "Update channel"} loading={isPending} loadingText={mode === "create" ? "Creating channel..." : "Updating channel..."} type="submit">
        {mode === "create" ? "Create channel" : "Save changes"}
      </Button>
    </form>
  );
}
