"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createTransformationAction, updateTransformationAction } from "@/lib/actions/transformations";
import { transformationSchema, type TransformationInput } from "@/lib/validations/transformation";
import type { MessageFormat, TransformationLanguage } from "@/types/database";
import { useUiStore } from "@/store/ui-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { ScriptEditor } from "./script-editor";

interface TransformationFormProps {
  assignedChannels?: Array<{ channelId: string; name: string; status: string }>;
  currentTransformationId?: string;
  initialValues?: TransformationInput;
  mode?: "create" | "edit";
}

const defaultValues: TransformationInput = {
  transformationId: "TRF-004",
  name: "",
  description: "",
  language: "javascript",
  inputFormat: "HL7v2",
  outputFormat: "FHIR_R4",
  version: 1,
  isActive: true,
  script: `function transform(message, maps) {\n  return {\n    resourceType: "Bundle",\n    type: "collection",\n    entry: [{ resource: message }],\n    trace: maps.channelMap?.traceId ?? null,\n  };\n}`,
};

const starterTemplates: Record<TransformationLanguage, (inputFormat: MessageFormat, outputFormat: MessageFormat) => string> = {
  javascript: (inputFormat, outputFormat) => `function transform(message, maps) {\n  // Input: ${inputFormat}\n  // Output: ${outputFormat}\n  return {\n    inputFormat: "${inputFormat}",\n    outputFormat: "${outputFormat}",\n    payload: message,\n    traceId: maps.channelMap?.traceId ?? null,\n  };\n}`,
  python: (inputFormat, outputFormat) => `def transform(message, maps):\n    # Input: ${inputFormat}\n    # Output: ${outputFormat}\n    return {\n        "inputFormat": "${inputFormat}",\n        "outputFormat": "${outputFormat}",\n        "payload": message,\n        "traceId": maps.get("channelMap", {}).get("traceId"),\n    }`,
  groovy: (inputFormat, outputFormat) => `def transform(message, maps) {\n  [\n    inputFormat: "${inputFormat}",\n    outputFormat: "${outputFormat}",\n    payload: message,\n    traceId: maps.channelMap?.traceId\n  ]\n}`,
  xslt: (inputFormat, outputFormat) => `<?xml version="1.0" encoding="UTF-8"?>\n<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">\n  <!-- Input: ${inputFormat} | Output: ${outputFormat} -->\n  <xsl:template match="/">\n    <transformed>\n      <inputFormat>${inputFormat}</inputFormat>\n      <outputFormat>${outputFormat}</outputFormat>\n    </transformed>\n  </xsl:template>\n</xsl:stylesheet>`,
};

export function TransformationForm({
  assignedChannels = [],
  currentTransformationId,
  initialValues,
  mode = "create",
}: TransformationFormProps) {
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
  } = useForm<TransformationInput>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(transformationSchema),
  });

  const language = watch("language");
  const inputFormat = watch("inputFormat");
  const outputFormat = watch("outputFormat");
  const version = watch("version");
  const isActive = watch("isActive");
  const scriptValue = watch("script");
  const trimmedScript = scriptValue.trim();
  const scriptStats = {
    characters: trimmedScript.length,
    lines: trimmedScript ? trimmedScript.split(/\r?\n/).length : 0,
  };

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading(mode === "create" ? "Provisioning transformation runtime..." : "Updating transformation runtime...");
      try {
        const result = mode === "edit" && currentTransformationId
          ? await updateTransformationAction(currentTransformationId, values)
          : await createTransformationAction(values);

        setServerMessage(result.message);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push(result.redirectTo ?? "/transformations");
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{mode === "create" ? "Create transformation" : "Edit transformation"}</p>
              <h2 className="display-face mt-3 text-4xl text-ink">Scripted runtime for message shaping.</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={isActive ? "good" : "neutral"}>{isActive ? "active" : "inactive"}</Badge>
              <Badge tone="gold">v{version}</Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="transformationId">Transformation ID</label>
              <Input aria-label="Transformation ID" id="transformationId" {...register("transformationId")} />
              {errors.transformationId ? <p className="text-sm text-alert">{errors.transformationId.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="name">Name</label>
              <Input aria-label="Transformation name" id="name" {...register("name")} />
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
              <label className="text-sm font-semibold text-ink" htmlFor="inputFormat">Input format</label>
              <Select aria-label="Input format" id="inputFormat" {...register("inputFormat")}>
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
              <label className="text-sm font-semibold text-ink" htmlFor="outputFormat">Output format</label>
              <Select aria-label="Output format" id="outputFormat" {...register("outputFormat")}>
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
              <label className="text-sm font-semibold text-ink" htmlFor="language">Language</label>
              <Select aria-label="Transformation language" id="language" {...register("language")}>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="groovy">Groovy</option>
                <option value="xslt">XSLT</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="version">Version</label>
              <Input aria-label="Transformation version" id="version" type="number" {...register("version", { valueAsNumber: true })} />
              {errors.version ? <p className="text-sm text-alert">{errors.version.message}</p> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-line-strong bg-white/72 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Runtime posture</p>
                <p className="mt-1 text-sm leading-6 text-muted">Toggle whether this transformation can be assigned to live channels.</p>
              </div>
              <label className="inline-flex items-center gap-3 rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-ink">
                <input aria-label="Transformation active" className="h-4 w-4 accent-teal" type="checkbox" {...register("isActive")} />
                Active for channel assignment
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Editor surface</p>
                <p className="mt-1 text-sm leading-6 text-muted">Use a typed script runtime and keep the conversion logic versioned with the transformation itself.</p>
              </div>
              <Button
                aria-label="Load starter template"
                type="button"
                variant="secondary"
                onClick={() => setValue("script", starterTemplates[language](inputFormat, outputFormat), { shouldDirty: true, shouldValidate: true })}
              >
                Load starter template
              </Button>
            </div>
            <Controller
              control={control}
              name="script"
              render={({ field }) => (
                <ScriptEditor language={language} value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.script ? <p className="text-sm text-alert">{errors.script.message}</p> : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="bg-[linear-gradient(145deg,rgba(225,253,248,0.95),rgba(255,255,255,0.82))] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Execution profile</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Format bridge</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{inputFormat} to {outputFormat}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Script size</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{scriptStats.lines}</p>
                    <p className="text-sm text-muted">lines of runtime logic</p>
                  </div>
                  <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Payload density</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{scriptStats.characters}</p>
                    <p className="text-sm text-muted">non-empty script characters</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Channel adoption</p>
                <p className="mt-1 text-sm leading-6 text-muted">Channels currently pinned to this transformation.</p>
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
                  No channels are attached yet. Save the transformation, then assign it from the channel designer.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-ink">Operator notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>Keep versions sequential so rollback decisions stay obvious in audit trails.</li>
              <li>Use inactive mode for draft scripts instead of deleting active runtime logic.</li>
              <li>Mirror the input and output formats to the actual channel contract before assignment.</li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : <p className="text-sm text-muted">Every save is validated on the client and the server before persistence.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button aria-label="Return to transformations" type="button" variant="secondary" onClick={() => router.push("/transformations")}>Back to transformations</Button>
          <Button aria-label={mode === "create" ? "Create transformation" : "Save transformation changes"} loading={isPending} loadingText={mode === "create" ? "Creating transformation..." : "Saving changes..."} type="submit">
            {mode === "create" ? "Create transformation" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
