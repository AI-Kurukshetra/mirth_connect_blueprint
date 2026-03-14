"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { ChannelRow } from "@/types/database";
import { SAMPLE_ADT_A01 } from "@/lib/hl7/samples";
import { simulatorSchema, type SimulatorInput } from "@/lib/validations/simulator";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProcessResponse = {
  success: boolean;
  result?: {
    messageId: string;
    status: string;
    messageType?: string;
    dataType?: string;
    processingTimeMs: number;
    destinations: Array<{ destinationId: string; connectorName: string; status: string; error?: string }>;
  };
  error?: string;
};

const sampleFhirPatient = JSON.stringify({
  resourceType: "Patient",
  id: "demo-patient-001",
  active: true,
  name: [{ family: "Doe", given: ["Jane"] }],
  gender: "female",
  birthDate: "1985-03-15",
}, null, 2);

export function SimulatorForm({
  channels,
  initialChannelId,
}: {
  channels: Pick<ChannelRow, "channel_id" | "name" | "message_format" | "status">[];
  initialChannelId?: string;
}) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [result, setResult] = useState<ProcessResponse["result"] | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultChannelId = initialChannelId && channels.some((channel) => channel.channel_id === initialChannelId)
    ? initialChannelId
    : channels[0]?.channel_id ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SimulatorInput>({
    defaultValues: {
      channelId: defaultChannelId,
      payload: SAMPLE_ADT_A01,
    },
    resolver: zodResolver(simulatorSchema),
  });

  const selectedChannelId = watch("channelId");
  const selectedChannel = channels.find((channel) => channel.channel_id === selectedChannelId);

  const applySample = (payload: string) => {
    setValue("payload", payload, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = handleSubmit((values) => {
    setResult(null);
    startTransition(async () => {
      startLoading("Processing test message...");
      try {
        const response = await fetch(`/api/channels/${values.channelId}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: values.payload }),
        });

        const data = (await response.json()) as ProcessResponse;

        if (!response.ok || !data.success || !data.result) {
          toast.error(data.error || "Failed to process test message.");
          return;
        }

        setResult(data.result);
        toast.success("Test message processed.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to process test message.");
      } finally {
        stopLoading();
      }
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="channelId">Channel</label>
            <Select aria-label="Select channel" id="channelId" {...register("channelId")}>
              {channels.map((channel) => (
                <option key={channel.channel_id} value={channel.channel_id}>
                  {channel.channel_id} - {channel.name}
                </option>
              ))}
            </Select>
            {errors.channelId ? <p className="text-sm text-alert">{errors.channelId.message}</p> : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="channelFormat">Detected format</label>
            <Input aria-label="Selected channel format" disabled id="channelFormat" value={selectedChannel?.message_format ?? "Unknown"} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => applySample(SAMPLE_ADT_A01)}>Load HL7 sample</Button>
          <Button type="button" variant="secondary" onClick={() => applySample(sampleFhirPatient)}>Load FHIR sample</Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="payload">Test payload</label>
          <Textarea aria-label="Test payload" className="min-h-[360px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id="payload" spellCheck={false} {...register("payload")} />
          {errors.payload ? <p className="text-sm text-alert">{errors.payload.message}</p> : null}
        </div>

        <Button aria-label="Send test message" loading={isPending} loadingText="Processing test message..." type="submit">
          Send test message
        </Button>
      </form>

      <div className="space-y-5 rounded-[30px] border border-line-strong bg-white/74 p-6 shadow-[0_30px_90px_rgba(17,32,42,0.08)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Execution</p>
          <h2 className="mt-3 text-2xl font-semibold text-ink">Simulation result</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Use this panel to validate test traffic before you rely on the main message explorer.</p>
        </div>

        {result ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Message ID</p>
                <p className="mt-2 font-[family:var(--font-jetbrains)] text-[13px] text-ink">{result.messageId}</p>
              </div>
              <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Status</p>
                <p className="mt-2 font-semibold text-ink">{result.status}</p>
              </div>
              <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Message Type</p>
                <p className="mt-2 font-semibold text-ink">{result.messageType || "Unknown"}</p>
              </div>
              <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Latency</p>
                <p className="mt-2 font-semibold text-ink">{result.processingTimeMs} ms</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Destinations</p>
                <Button type="button" variant="secondary" onClick={() => router.push(`/messages/${result.messageId}`)}>Open message</Button>
              </div>
              <div className="mt-4 space-y-3">
                {result.destinations.length > 0 ? result.destinations.map((destination) => (
                  <div key={destination.destinationId} className="rounded-[20px] border border-line bg-white/70 px-4 py-3">
                    <p className="font-semibold text-ink">{destination.connectorName}</p>
                    <p className="mt-1 text-sm text-muted">{destination.status}{destination.error ? ` - ${destination.error}` : ""}</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted">No destination connectors were configured for this channel, so the message stopped after transformation.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-line-strong bg-white/50 p-5 text-sm leading-6 text-muted">
            Choose a channel, load a sample, and process it. The result will include a persisted message id that opens directly in the detail viewer.
          </div>
        )}
      </div>
    </div>
  );
}
