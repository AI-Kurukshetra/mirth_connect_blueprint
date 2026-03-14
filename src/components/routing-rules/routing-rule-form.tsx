"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createRoutingRuleAction, updateRoutingRuleAction } from "@/lib/actions/routing-rules";
import { routingRuleSchema, type RoutingRuleInput } from "@/lib/validations/routing-rule";
import type { RoutingAction, RoutingConditionType, RoutingOperator } from "@/types/database";
import { useUiStore } from "@/store/ui-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface RoutingRuleFormProps {
  channels: Array<{ channelId: string; name: string; status: string }>;
  currentRuleId?: string;
  initialValues?: RoutingRuleInput;
  mode?: "create" | "edit";
}

const defaultValues: RoutingRuleInput = {
  ruleId: "RR-004",
  name: "",
  description: "",
  channelId: "",
  priority: 1,
  conditionType: "message_type",
  conditionField: "MSH.9",
  conditionOperator: "equals",
  conditionValue: "ADT^A01",
  action: "route_to",
  destinationChannelId: "",
  isActive: true,
};

const conditionFieldTemplates: Record<RoutingConditionType, string> = {
  message_type: "MSH.9",
  field_value: "PID.3",
  source: "source_system",
  format: "message_format",
  custom: "channel_map.routeHint",
};

const conditionValueTemplates: Record<RoutingOperator, string> = {
  equals: "ADT^A01",
  contains: "Pharmacy",
  starts_with: "ORU",
  regex: "^ADT\\^A0[18]$",
  exists: "",
};

const actionToneMap: Record<RoutingAction, "good" | "neutral" | "gold" | "warm"> = {
  route_to: "good",
  filter: "gold",
  transform: "neutral",
  duplicate: "neutral",
  archive: "warm",
};

export function RoutingRuleForm({
  channels,
  currentRuleId,
  initialValues,
  mode = "create",
}: RoutingRuleFormProps) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoutingRuleInput>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(routingRuleSchema),
  });

  const sourceChannelId = watch("channelId");
  const action = watch("action");
  const conditionType = watch("conditionType");
  const conditionOperator = watch("conditionOperator");
  const destinationChannelId = watch("destinationChannelId");
  const priority = watch("priority");
  const isActive = watch("isActive");
  const conditionField = watch("conditionField");
  const conditionValue = watch("conditionValue");

  const sourceChannel = channels.find((channel) => channel.channelId === sourceChannelId) ?? null;
  const destinationChannel = channels.find((channel) => channel.channelId === destinationChannelId) ?? null;
  const availableDestinations = channels.filter((channel) => channel.channelId !== sourceChannelId);

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading(mode === "create" ? "Provisioning routing rule..." : "Updating routing rule...");
      try {
        const result = mode === "edit" && currentRuleId
          ? await updateRoutingRuleAction(currentRuleId, values)
          : await createRoutingRuleAction(values);

        setServerMessage(result.message);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push(result.redirectTo ?? "/routing-rules");
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{mode === "create" ? "Create routing rule" : "Edit routing rule"}</p>
              <h2 className="display-face mt-3 text-4xl text-ink">Decide where the message goes next.</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={isActive ? "good" : "neutral"}>{isActive ? "active" : "inactive"}</Badge>
              <Badge tone={actionToneMap[action]}>{action.replaceAll("_", " ")}</Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="ruleId">Rule ID</label>
              <Input aria-label="Rule ID" id="ruleId" {...register("ruleId")} />
              {errors.ruleId ? <p className="text-sm text-alert">{errors.ruleId.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="name">Name</label>
              <Input aria-label="Routing rule name" id="name" {...register("name")} />
              {errors.name ? <p className="text-sm text-alert">{errors.name.message}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="description">Operational description</label>
            <Textarea aria-label="Operational description" id="description" {...register("description")} />
            {errors.description ? <p className="text-sm text-alert">{errors.description.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-semibold text-ink" htmlFor="channelId">Source channel</label>
              <Select aria-label="Source channel" id="channelId" {...register("channelId")}>
                <option value="">Select source channel</option>
                {channels.map((channel) => (
                  <option key={channel.channelId} value={channel.channelId}>{channel.channelId} - {channel.name}</option>
                ))}
              </Select>
              {errors.channelId ? <p className="text-sm text-alert">{errors.channelId.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="priority">Priority</label>
              <Input aria-label="Routing priority" id="priority" type="number" {...register("priority", { valueAsNumber: true })} />
              {errors.priority ? <p className="text-sm text-alert">{errors.priority.message}</p> : null}
            </div>
            <div className="rounded-[24px] border border-line-strong bg-white/72 px-4 py-3">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
                Active for runtime
                <input aria-label="Routing rule active" className="h-4 w-4 accent-teal" type="checkbox" {...register("isActive")} />
              </label>
              <p className="mt-2 text-sm leading-6 text-muted">Deactivate the rule to keep it available without affecting routing decisions.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-line-strong bg-white/68 p-5">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[0.8fr_1fr_0.8fr] lg:items-end">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink" htmlFor="conditionType">Condition type</label>
                <Select aria-label="Condition type" id="conditionType" {...register("conditionType")}>
                  <option value="message_type">Message type</option>
                  <option value="field_value">Field value</option>
                  <option value="source">Source</option>
                  <option value="format">Format</option>
                  <option value="custom">Custom</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink" htmlFor="conditionField">Condition field</label>
                <Input aria-label="Condition field" id="conditionField" {...register("conditionField")} />
                {errors.conditionField ? <p className="text-sm text-alert">{errors.conditionField.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Button
                  aria-label="Load condition template"
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setValue("conditionField", conditionFieldTemplates[conditionType], { shouldDirty: true, shouldValidate: true });
                    setValue("conditionValue", conditionValueTemplates[conditionOperator], { shouldDirty: true, shouldValidate: true });
                  }}
                >
                  Load condition template
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[0.8fr_1fr_0.8fr]">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink" htmlFor="conditionOperator">Operator</label>
                <Select aria-label="Condition operator" id="conditionOperator" {...register("conditionOperator")}>
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="starts_with">Starts with</option>
                  <option value="regex">Regex</option>
                  <option value="exists">Exists</option>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-ink" htmlFor="conditionValue">Condition value</label>
                <Input aria-label="Condition value" disabled={conditionOperator === "exists"} id="conditionValue" placeholder={conditionOperator === "exists" ? "Not required for exists" : "Expected value or regex"} {...register("conditionValue")} />
                {errors.conditionValue ? <p className="text-sm text-alert">{errors.conditionValue.message}</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="action">Action</label>
              <Select aria-label="Routing action" id="action" {...register("action")}>
                <option value="route_to">Route to channel</option>
                <option value="filter">Filter</option>
                <option value="transform">Transform</option>
                <option value="duplicate">Duplicate</option>
                <option value="archive">Archive</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="destinationChannelId">Destination channel</label>
              <Select aria-label="Destination channel" id="destinationChannelId" {...register("destinationChannelId")}>
                <option value="">No destination channel</option>
                {availableDestinations.map((channel) => (
                  <option key={channel.channelId} value={channel.channelId}>{channel.channelId} - {channel.name}</option>
                ))}
              </Select>
              {errors.destinationChannelId ? <p className="text-sm text-alert">{errors.destinationChannelId.message}</p> : null}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="bg-[linear-gradient(145deg,rgba(244,250,236,0.95),rgba(255,255,255,0.82))] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Route preview</p>
              <div className="mt-5 space-y-3">
                <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Priority</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{priority}</p>
                  <p className="text-sm text-muted">lower numbers evaluate first</p>
                </div>
                <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Flow path</p>
                  <div className="mt-3 space-y-3 text-sm text-ink">
                    <div className="rounded-[20px] border border-line-strong bg-white px-4 py-3">
                      <p className="font-semibold">{sourceChannel?.name ?? "Select a source channel"}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{sourceChannel?.channelId ?? "source"}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                      <span>{conditionType.replaceAll("_", " ")}</span>
                      <span aria-hidden="true">/</span>
                      <span>{action.replaceAll("_", " ")}</span>
                    </div>
                    <div className="rounded-[20px] border border-line-strong bg-white px-4 py-3">
                      <p className="font-semibold">{destinationChannel?.name ?? (action === "route_to" || action === "duplicate" ? "Select a destination channel" : "No destination required")}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{destinationChannel?.channelId ?? "destination"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-ink">Condition summary</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p><span className="font-semibold text-ink">Field:</span> {conditionField || "No field selected yet."}</p>
              <p><span className="font-semibold text-ink">Operator:</span> {conditionOperator.replaceAll("_", " ")}</p>
              <p><span className="font-semibold text-ink">Value:</span> {conditionOperator === "exists" ? "Exists check only" : (conditionValue || "No value set yet.")}</p>
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-ink">Operator notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>Use lower priority numbers for the first branch you want evaluated in a channel.</li>
              <li>Prefer `filter` for quarantine decisions and `route_to` for clean downstream hand-offs.</li>
              <li>Keep destination lanes distinct to avoid loops and accidental duplicate processing.</li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : <p className="text-sm text-muted">Every save is validated on the client and the server before persistence.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button aria-label="Return to routing rules" type="button" variant="secondary" onClick={() => router.push("/routing-rules")}>Back to routing</Button>
          <Button aria-label={mode === "create" ? "Create routing rule" : "Save routing rule changes"} loading={isPending} loadingText={mode === "create" ? "Creating routing rule..." : "Saving changes..."} type="submit">
            {mode === "create" ? "Create rule" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
