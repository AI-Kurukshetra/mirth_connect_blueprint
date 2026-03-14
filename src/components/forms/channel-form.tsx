"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ChannelLaneVisual } from "@/components/channels/channel-lane-visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createChannelAction, updateChannelAction } from "@/lib/actions/channels";
import { channelSchema, type ChannelInput } from "@/lib/validations/channel";
import { useUiStore } from "@/store/ui-store";

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

function resilienceLabel(retryCount: number, retryInterval: number) {
  if (retryCount >= 5) {
    return `High resilience posture with ${retryCount} attempts every ${retryInterval}s.`;
  }

  if (retryCount === 0) {
    return "No retry safety net is configured for this lane.";
  }

  return `Balanced retry posture with ${retryCount} attempts every ${retryInterval}s.`;
}

export function ChannelForm({ mode = "create", currentChannelId, initialValues }: ChannelFormProps) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChannelInput>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(channelSchema),
  });

  const values = watch();

  const onSubmit = handleSubmit((draft) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading(mode === "create" ? "Provisioning integration lane..." : "Updating integration lane...");
      try {
        const result = mode === "edit" && currentChannelId
          ? await updateChannelAction(currentChannelId, draft)
          : await createChannelAction(draft);

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
    <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={onSubmit}>
      <div className="space-y-5">
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge tone={values.status === "active" ? "good" : values.status === "error" ? "warm" : values.status === "paused" ? "gold" : "neutral"}>{values.status}</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-ink">{mode === "create" ? "Channel identity" : `Editing ${values.channelId || currentChannelId}`}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">Set the operator-facing lane identity, transport pairing, retry posture, and status in one pass.</p>
            </div>
            <div className="rounded-[22px] border border-line-strong bg-[#f8f4ec] px-4 py-3 text-sm text-muted">
              {resilienceLabel(values.retryCount, values.retryInterval)}
            </div>
          </div>

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
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button aria-label={mode === "create" ? "Create channel" : "Update channel"} loading={isPending} loadingText={mode === "create" ? "Creating channel..." : "Updating channel..."} type="submit">
            {mode === "create" ? "Create channel" : "Save changes"}
          </Button>
          {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : null}
        </div>
      </div>

      <div className="space-y-5 xl:sticky xl:top-6">
        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(145deg,rgba(10,24,32,0.98),rgba(15,72,80,0.94)_42%,rgba(147,168,94,0.9)_100%)] p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">Draft preview</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{values.name || values.channelId}</h3>
            <p className="mt-3 text-sm leading-7 text-white/72">{values.description || "A concise operator-facing summary keeps this lane understandable in incident mode."}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="neutral">{values.channelId}</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{values.messageFormat.replaceAll("_", " ")}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal/10 text-teal">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Flow preview</p>
              <h3 className="mt-1 text-xl font-semibold text-ink">Lane topology</h3>
            </div>
          </div>
          <div className="mt-4">
            <ChannelLaneVisual destinationType={values.destinationType} messageFormat={values.messageFormat} sourceType={values.sourceType} status={values.status} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/12 text-gold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Operator checklist</p>
              <h3 className="mt-1 text-xl font-semibold text-ink">Before saving</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-6 text-muted">
            <p>Keep source and destination aligned with the selected message format.</p>
            <p>Higher retry counts are safer for fragile endpoints but slower to surface downstream outages.</p>
            <p>Use paused when you need to preserve the lane without allowing fresh traffic.</p>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-[20px] border border-line-strong bg-[#f8f4ec] px-4 py-3 text-sm text-muted">
            <ArrowRight className="h-4 w-4 text-teal" />
            Full connector JSON and script tuning lives in the visual designer after this save.
          </div>
        </Card>
      </div>
    </form>
  );
}