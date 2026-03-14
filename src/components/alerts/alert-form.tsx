"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createAlertAction, updateAlertAction } from "@/lib/actions/alerts";
import {
  alertNotificationChannels,
  alertSchema,
  alertThresholdOperators,
  alertTriggerTypes,
  type AlertInput,
} from "@/lib/validations/alert";
import { useUiStore } from "@/store/ui-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { TestAlertButton } from "./test-alert-button";

interface AlertFormProps {
  currentAlertId?: string;
  historyPreview?: Array<{ id: string; triggeredAt: string; message: string | null; triggerValue: number | null; notified: boolean }>;
  initialValues?: AlertInput;
  mode?: "create" | "edit";
}

const defaultValues: AlertInput = {
  alertId: "ALT-003",
  name: "",
  description: "",
  triggerType: "queue_depth",
  thresholdValue: 25,
  thresholdOperator: "gt",
  notificationChannel: "email",
  notificationTarget: "ops@medflow.local",
  cooldownMinutes: 15,
  isActive: true,
};

const triggerGuide = {
  error_rate: "Watch the ratio of failed to successful traffic across the current processing window.",
  latency: "Escalate when message turnaround drifts outside the expected response budget.",
  message_failure: "Fire on repeated message-level failures after retries have started stacking.",
  channel_down: "Use when a channel stops processing or its downstream edge becomes unavailable.",
  queue_depth: "Protect operators from hidden backlog growth before delivery SLAs slip.",
  custom: "Reserve for bespoke thresholds or composite conditions handled by custom automation.",
} as const;

const channelToneMap = {
  email: "good",
  webhook: "neutral",
  slack: "gold",
  sms: "warm",
} as const;

export function AlertForm({ currentAlertId, historyPreview = [], initialValues, mode = "create" }: AlertFormProps) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = useForm<AlertInput>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(alertSchema),
  });

  const triggerType = watch("triggerType");
  const notificationChannel = watch("notificationChannel");
  const thresholdValue = watch("thresholdValue");
  const thresholdOperator = watch("thresholdOperator");
  const target = watch("notificationTarget");
  const cooldownMinutes = watch("cooldownMinutes");
  const isActive = watch("isActive");
  const previewLine = useMemo(() => {
    const value = typeof thresholdValue === "number" && Number.isFinite(thresholdValue) ? thresholdValue : "threshold";
    return `${triggerType.replaceAll("_", " ")} ${thresholdOperator} ${value}`;
  }, [thresholdOperator, thresholdValue, triggerType]);

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading(mode === "create" ? "Provisioning alert rule..." : "Updating alert rule...");
      try {
        const result = mode === "edit" && currentAlertId
          ? await updateAlertAction(currentAlertId, values)
          : await createAlertAction(values);

        setServerMessage(result.message);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push(result.redirectTo ?? "/alerts");
        router.refresh();
      } finally {
        stopLoading();
      }
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-3 border-b border-line/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{mode === "create" ? "Create alert" : "Edit alert"}</p>
              <h2 className="display-face mt-3 text-4xl text-ink">Tune the operator escalation before the shift notices drift.</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={isActive ? "good" : "neutral"}>{isActive ? "active" : "inactive"}</Badge>
              <Badge tone={channelToneMap[notificationChannel]}>{notificationChannel}</Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="alertId">Alert ID</label>
              <Input aria-label="Alert ID" id="alertId" {...register("alertId")} />
              {errors.alertId ? <p className="text-sm text-alert">{errors.alertId.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="name">Name</label>
              <Input aria-label="Alert name" id="name" {...register("name")} />
              {errors.name ? <p className="text-sm text-alert">{errors.name.message}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="description">Operator description</label>
            <Textarea aria-label="Alert description" id="description" {...register("description")} />
            {errors.description ? <p className="text-sm text-alert">{errors.description.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-semibold text-ink" htmlFor="triggerType">Trigger type</label>
              <Select aria-label="Trigger type" id="triggerType" {...register("triggerType")}>
                {alertTriggerTypes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="thresholdOperator">Operator</label>
              <Select aria-label="Threshold operator" id="thresholdOperator" {...register("thresholdOperator")}>
                {alertThresholdOperators.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="thresholdValue">Threshold</label>
              <Input aria-label="Threshold value" id="thresholdValue" type="number" {...register("thresholdValue", { valueAsNumber: true })} />
              {errors.thresholdValue ? <p className="text-sm text-alert">{errors.thresholdValue.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_180px]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="notificationChannel">Notification channel</label>
              <Select aria-label="Notification channel" id="notificationChannel" {...register("notificationChannel")}>
                {alertNotificationChannels.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="notificationTarget">Delivery target</label>
              <Input aria-label="Notification target" id="notificationTarget" placeholder={notificationChannel === "email" ? "ops@medflow.local" : notificationChannel === "sms" ? "+1 555 010 0202" : "https://hooks.medflow.local/ops"} {...register("notificationTarget")} />
              {errors.notificationTarget ? <p className="text-sm text-alert">{errors.notificationTarget.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="cooldownMinutes">Cooldown</label>
              <Input aria-label="Cooldown minutes" id="cooldownMinutes" type="number" {...register("cooldownMinutes", { valueAsNumber: true })} />
              {errors.cooldownMinutes ? <p className="text-sm text-alert">{errors.cooldownMinutes.message}</p> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-line-strong bg-white/72 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Escalation posture</p>
                <p className="mt-1 text-sm leading-6 text-muted">{triggerGuide[triggerType]}</p>
              </div>
              <label className="inline-flex items-center gap-3 rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-ink">
                <input aria-label="Alert active" className="h-4 w-4 accent-teal" type="checkbox" {...register("isActive")} />
                Active for notification delivery
              </label>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="bg-[linear-gradient(155deg,rgba(17,32,42,0.96),rgba(207,106,65,0.86))] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Escalation preview</p>
              <p className="mt-4 text-3xl font-semibold">{previewLine}</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/74">Deliver through {notificationChannel} to {target || "target pending"} with a {cooldownMinutes || 0}-minute cooldown.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[24px] border border-white/14 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Trigger family</p>
                  <p className="mt-2 text-lg font-semibold">{triggerType.replaceAll("_", " ")}</p>
                </div>
                <div className="rounded-[24px] border border-white/14 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Delivery</p>
                  <p className="mt-2 text-lg font-semibold">{notificationChannel}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Recent trigger history</p>
                <p className="mt-1 text-sm leading-6 text-muted">Use this to verify delivery cadence and cooldown behavior.</p>
              </div>
              <Badge tone={historyPreview.length > 0 ? "good" : "neutral"}>{historyPreview.length} events</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {historyPreview.length > 0 ? historyPreview.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-line-strong bg-white/76 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{item.message ?? "Triggered"}</p>
                    <Badge tone={item.notified ? "good" : "gold"}>{item.notified ? "delivered" : "queued"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">Value: {item.triggerValue ?? "n/a"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{new Date(item.triggeredAt).toLocaleString()}</p>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-line-strong bg-white/54 px-4 py-5 text-sm leading-6 text-muted">
                  No trigger history yet. Save the alert, then fire a simulated trigger from the editor.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-ink">Operator notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>Keep thresholds stable long enough to compare one shift against the next.</li>
              <li>Prefer email or Slack for contextual alerts, SMS only for true wake-up conditions.</li>
              <li>Use manual trigger tests after every change to prove the target route still receives events.</li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : <p className="text-sm text-muted">Every save is validated on the client and the server before persistence.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button aria-label="Return to alerts" type="button" variant="secondary" onClick={() => router.push("/alerts")}>Back to alerts</Button>
          {mode === "edit" && currentAlertId ? <TestAlertButton alertId={currentAlertId} /> : null}
          <Button aria-label={mode === "create" ? "Create alert" : "Save alert changes"} loading={isPending} loadingText={mode === "create" ? "Creating alert..." : "Saving changes..."} type="submit">
            {mode === "create" ? "Create alert" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}