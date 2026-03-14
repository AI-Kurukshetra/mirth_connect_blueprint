"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createValidationRuleAction, updateValidationRuleAction } from "@/lib/actions/validation-rules";
import { validationRuleSchema, type ValidationRuleInput } from "@/lib/validations/validation-rule";
import type { MessageFormat, ValidationRuleType, ValidationSeverity } from "@/types/database";
import { useUiStore } from "@/store/ui-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { RuleDefinitionEditor } from "./rule-definition-editor";

interface ValidationRuleFormProps {
  assignedChannels?: Array<{ channelId: string; name: string; status: string }>;
  currentRuleId?: string;
  initialValues?: ValidationRuleInput;
  mode?: "create" | "edit";
}

const defaultValues: ValidationRuleInput = {
  ruleId: "VAL-004",
  name: "",
  description: "",
  messageFormat: "HL7v2",
  ruleType: "required_fields",
  severity: "error",
  isActive: true,
  ruleDefinition: JSON.stringify({ required: ["MSH.9", "PID.3"] }, null, 2),
};

const definitionTemplates: Record<ValidationRuleType, (messageFormat: MessageFormat) => string> = {
  required_fields: (messageFormat) => JSON.stringify({ messageFormat, required: messageFormat.startsWith("FHIR") ? ["resourceType", "id"] : ["MSH.9", "PID.3"] }, null, 2),
  schema: (messageFormat) => JSON.stringify({ messageFormat, resourceType: messageFormat.startsWith("FHIR") ? "Patient" : "ADT", required: messageFormat.startsWith("FHIR") ? ["resourceType", "id", "name"] : ["MSH.9", "EVN.1", "PID.3"] }, null, 2),
  format: (messageFormat) => JSON.stringify({ messageFormat, field: messageFormat.startsWith("FHIR") ? "meta.versionId" : "MSH.12", pattern: messageFormat.startsWith("FHIR") ? "^[0-9]+$" : "^2\\.[0-9]+$" }, null, 2),
  custom: (messageFormat) => JSON.stringify({ messageFormat, expression: messageFormat.startsWith("FHIR") ? "resourceType === 'Patient' && Array.isArray(name)" : "segments.PID?.['PID.3'] && segments.MSH?.['MSH.9']" }, null, 2),
};

const severityToneMap: Record<ValidationSeverity, "warm" | "gold" | "neutral"> = {
  error: "warm",
  warning: "gold",
  info: "neutral",
};

export function ValidationRuleForm({
  assignedChannels = [],
  currentRuleId,
  initialValues,
  mode = "create",
}: ValidationRuleFormProps) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ValidationRuleInput>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(validationRuleSchema),
  });

  const messageFormat = watch("messageFormat");
  const ruleType = watch("ruleType");
  const severity = watch("severity");
  const isActive = watch("isActive");
  const ruleDefinition = watch("ruleDefinition");
  const ruleSummary = (() => {
    try {
      const parsed = JSON.parse(ruleDefinition) as Record<string, unknown>;
      return Object.keys(parsed);
    } catch {
      return [];
    }
  })();

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading(mode === "create" ? "Provisioning validation rule..." : "Updating validation rule...");
      try {
        const result = mode === "edit" && currentRuleId
          ? await updateValidationRuleAction(currentRuleId, values)
          : await createValidationRuleAction(values);

        setServerMessage(result.message);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push(result.redirectTo ?? "/validation-rules");
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{mode === "create" ? "Create validation rule" : "Edit validation rule"}</p>
              <h2 className="display-face mt-3 text-4xl text-ink">Define the gate before routing continues.</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={isActive ? "good" : "neutral"}>{isActive ? "active" : "inactive"}</Badge>
              <Badge tone={severityToneMap[severity]}>{severity}</Badge>
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
              <Input aria-label="Validation rule name" id="name" {...register("name")} />
              {errors.name ? <p className="text-sm text-alert">{errors.name.message}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="description">Operational description</label>
            <Textarea aria-label="Operational description" id="description" {...register("description")} />
            {errors.description ? <p className="text-sm text-alert">{errors.description.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="messageFormat">Message format</label>
              <Select aria-label="Message format" id="messageFormat" {...register("messageFormat")}>
                <option value="HL7v2">HL7v2</option>
                <option value="HL7v3">HL7v3</option>
                <option value="FHIR_R4">FHIR R4</option>
                <option value="FHIR_R5">FHIR R5</option>
                <option value="JSON">JSON</option>
                <option value="XML">XML</option>
                <option value="CSV">CSV</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="ruleType">Rule type</label>
              <Select aria-label="Validation rule type" id="ruleType" {...register("ruleType")}>
                <option value="required_fields">Required fields</option>
                <option value="schema">Schema</option>
                <option value="format">Format</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="severity">Severity</label>
              <Select aria-label="Validation severity" id="severity" {...register("severity")}>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </Select>
            </div>
            <div className="rounded-[24px] border border-line-strong bg-white/72 px-4 py-3">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
                Active for enforcement
                <input aria-label="Validation rule active" className="h-4 w-4 accent-teal" type="checkbox" {...register("isActive")} />
              </label>
              <p className="mt-2 text-sm leading-6 text-muted">Disable this rule to keep it available without enforcing it during runtime.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Definition editor</p>
                <p className="mt-1 text-sm leading-6 text-muted">Rule definitions are stored as JSON so the runtime can evaluate them without another translation layer.</p>
              </div>
              <Button
                aria-label="Load validation rule template"
                type="button"
                variant="secondary"
                onClick={() => setValue("ruleDefinition", definitionTemplates[ruleType](messageFormat), { shouldDirty: true, shouldValidate: true })}
              >
                Load starter template
              </Button>
            </div>
            <Controller
              control={control}
              name="ruleDefinition"
              render={({ field }) => <RuleDefinitionEditor value={field.value} onChange={field.onChange} />}
            />
            {errors.ruleDefinition ? <p className="text-sm text-alert">{errors.ruleDefinition.message}</p> : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="bg-[linear-gradient(145deg,rgba(236,245,255,0.95),rgba(255,255,255,0.82))] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Enforcement profile</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Message contract</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{messageFormat}</p>
                  <p className="text-sm text-muted">{ruleType.replaceAll("_", " ")}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Definition keys</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{ruleSummary.length}</p>
                    <p className="text-sm text-muted">top-level rule attributes in the JSON object</p>
                  </div>
                  <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Severity posture</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{severity}</p>
                    <p className="text-sm text-muted">runtime escalation level for failed evaluations</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Linked channels</p>
                <p className="mt-1 text-sm leading-6 text-muted">Channels currently enforcing this rule.</p>
              </div>
              <Badge tone={assignedChannels.length > 0 ? "good" : "neutral"}>{assignedChannels.length} linked</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {assignedChannels.length > 0 ? assignedChannels.map((channel) => (
                <Link
                  key={channel.channelId}
                  className="flex items-center justify-between rounded-[22px] border border-line-strong bg-white/76 px-4 py-3 hover:-translate-y-0.5 hover:border-ink/20 hover:bg-white"
                  href={`/channels/${channel.channelId}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{channel.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{channel.channelId}</p>
                  </div>
                  <Badge tone={channel.status === "active" ? "good" : channel.status === "error" ? "warm" : "neutral"}>{channel.status}</Badge>
                </Link>
              )) : (
                <div className="rounded-[22px] border border-dashed border-line-strong bg-white/54 px-4 py-5 text-sm leading-6 text-muted">
                  No channels are attached yet. Save the rule, then assign it from the channel designer.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-ink">Definition preview</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ruleSummary.length > 0 ? ruleSummary.map((key) => (
                <Badge key={key} tone="neutral">{key}</Badge>
              )) : <p className="text-sm text-muted">Add valid JSON to preview rule keys.</p>}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : <p className="text-sm text-muted">Every save is validated on the client and the server before persistence.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button aria-label="Return to validation rules" type="button" variant="secondary" onClick={() => router.push("/validation-rules")}>Back to rules</Button>
          <Button aria-label={mode === "create" ? "Create validation rule" : "Save validation rule changes"} loading={isPending} loadingText={mode === "create" ? "Creating validation rule..." : "Saving changes..."} type="submit">
            {mode === "create" ? "Create rule" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
