"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { saveChannelDesignerAction } from "@/lib/actions/channels";
import { channelDesignerSchema, type ChannelDesignerInput } from "@/lib/validations/channel-designer";
import { useUiStore } from "@/store/ui-store";
import { ChannelFlowBlueprint } from "@/components/channels/channel-flow-blueprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const sourceConnectorOptions = [
  { value: "hl7_listener", label: "HL7 Listener" },
  { value: "http_listener", label: "HTTP Listener" },
  { value: "fhir_subscription", label: "FHIR Subscription" },
  { value: "database_reader", label: "Database Reader" },
  { value: "file_reader", label: "File Reader" },
] as const;

const destinationConnectorOptions = [
  { value: "mllp_sender", label: "MLLP Sender" },
  { value: "http_sender", label: "HTTP Sender" },
  { value: "fhir_repository", label: "FHIR Repository" },
  { value: "database_writer", label: "Database Writer" },
  { value: "sftp_sender", label: "SFTP Sender" },
] as const;

const dataTypeOptions = ["HL7v2", "HL7v3", "FHIR_R4", "FHIR_R5", "JSON", "XML"] as const;
const statusOptions = ["active", "paused", "inactive", "error"] as const;

function prettyJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function buildDestination(messageFormat: ChannelDesignerInput["messageFormat"], index: number): ChannelDesignerInput["destinations"][number] {
  return {
    name: `Destination ${index + 1}`,
    enabled: true,
    connectorType: "http_sender",
    connectorProperties: prettyJson({ url: "https://api.example.com/intake", method: "POST" }),
    filterScript: "",
    transformerScript: "",
    responseTransformerScript: "",
    queueEnabled: true,
    retryCount: 3,
    retryIntervalMs: 30000,
    inboundDataType: messageFormat,
    outboundDataType: messageFormat,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-alert">{message}</p>;
}

export function ChannelDesignerForm({
  channelId,
  initialValues,
}: {
  channelId: string;
  initialValues: ChannelDesignerInput;
}) {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ChannelDesignerInput>({
    defaultValues: initialValues,
    resolver: zodResolver(channelDesignerSchema),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "destinations",
  });

  const values = watch();

  const onSubmit = handleSubmit((payload) => {
    startTransition(async () => {
      startLoading("Saving channel designer...");
      try {
        const result = await saveChannelDesignerAction(channelId, payload);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push(result.redirectTo ?? `/channels/${channelId}/designer`);
        router.refresh();
      } finally {
        stopLoading();
      }
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
      <form className="space-y-6" onSubmit={onSubmit}>
        <section className="rounded-[30px] border border-line-strong bg-white/78 p-6 shadow-[0_24px_72px_rgba(17,32,42,0.08)] sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Channel studio</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Designer controls</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">Tune routing behavior, script stages, and destination fan-out from one operational surface.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => reset(initialValues)}>
                Reset
              </Button>
              <Button loading={isPending} loadingText="Saving designer..." type="submit">
                Save designer
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-line-strong bg-white/78 p-6 shadow-[0_24px_72px_rgba(17,32,42,0.08)] sm:p-7">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-semibold text-ink" htmlFor="name">Channel name</label>
              <Input id="name" {...register("name")} />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-semibold text-ink" htmlFor="description">Operational description</label>
              <Textarea id="description" rows={4} {...register("description")} />
              <FieldError message={errors.description?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="messageFormat">Message format</label>
              <Select id="messageFormat" {...register("messageFormat")}>
                {dataTypeOptions.map((option) => (
                  <option key={option} value={option}>{option.replace("_", " ")}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="status">Status</label>
              <Select id="status" {...register("status")}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="retryCount">Retry count</label>
              <Input id="retryCount" type="number" {...register("retryCount", { valueAsNumber: true })} />
              <FieldError message={errors.retryCount?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="retryInterval">Retry interval (seconds)</label>
              <Input id="retryInterval" type="number" {...register("retryInterval", { valueAsNumber: true })} />
              <FieldError message={errors.retryInterval?.message} />
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-line-strong bg-white/78 p-6 shadow-[0_24px_72px_rgba(17,32,42,0.08)] sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/10 text-teal">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Source intake</p>
              <h3 className="mt-1 text-2xl font-semibold text-ink">Connector and message shaping</h3>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="sourceConnectorType">Source connector</label>
              <Select id="sourceConnectorType" {...register("sourceConnectorType")}>
                {sourceConnectorOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <FieldError message={errors.sourceConnectorType?.message} />
            </div>

            <div className="rounded-[24px] border border-line bg-[#f8f4ec] px-4 py-4 text-sm leading-6 text-muted">
              Source connectors define the ingress point. Keep host, path, topic, and credentials in the JSON properties block below.
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-semibold text-ink" htmlFor="sourceConnectorProperties">Connector properties JSON</label>
              <Textarea className="min-h-[180px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id="sourceConnectorProperties" spellCheck={false} {...register("sourceConnectorProperties")} />
              <FieldError message={errors.sourceConnectorProperties?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="sourceFilterScript">Source filter script</label>
              <Textarea className="min-h-[180px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id="sourceFilterScript" spellCheck={false} {...register("sourceFilterScript")} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="sourceTransformerScript">Source transformer script</label>
              <Textarea className="min-h-[180px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id="sourceTransformerScript" spellCheck={false} {...register("sourceTransformerScript")} />
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-line-strong bg-white/78 p-6 shadow-[0_24px_72px_rgba(17,32,42,0.08)] sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Automation scripts</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">Pre and post processing</h3>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="preprocessorScript">Preprocessor</label>
              <Textarea className="min-h-[180px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id="preprocessorScript" spellCheck={false} {...register("preprocessorScript")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="postprocessorScript">Postprocessor</label>
              <Textarea className="min-h-[180px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id="postprocessorScript" spellCheck={false} {...register("postprocessorScript")} />
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-line-strong bg-white/78 p-6 shadow-[0_24px_72px_rgba(17,32,42,0.08)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Destinations</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">Fan-out lanes</h3>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => append(buildDestination(form.getValues("messageFormat"), fields.length))}
            >
              <Plus className="h-4 w-4" />
              Add destination
            </Button>
          </div>
          <FieldError message={errors.destinations?.message} />

          <div className="mt-6 space-y-5">
            {fields.map((field, index) => {
              const destinationErrors = errors.destinations?.[index];
              return (
                <div key={field.id} className="rounded-[26px] border border-line-strong bg-[#fbf7ef] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Lane {index + 1}</p>
                      <h4 className="mt-2 text-xl font-semibold text-ink">Destination branch</h4>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
                        <input type="checkbox" className="h-4 w-4 accent-teal" {...register(`destinations.${index}.enabled`)} />
                        Enabled
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
                        <input type="checkbox" className="h-4 w-4 accent-teal" {...register(`destinations.${index}.queueEnabled`)} />
                        Queue mode
                      </label>
                      <Button type="button" variant="ghost" disabled={fields.length === 1} onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-name-${index}`}>Destination name</label>
                      <Input id={`dest-name-${index}`} {...register(`destinations.${index}.name`)} />
                      <FieldError message={destinationErrors?.name?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-connector-${index}`}>Connector type</label>
                      <Select id={`dest-connector-${index}`} {...register(`destinations.${index}.connectorType`)}>
                        {destinationConnectorOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                      <FieldError message={destinationErrors?.connectorType?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-inbound-${index}`}>Inbound data type</label>
                      <Select id={`dest-inbound-${index}`} {...register(`destinations.${index}.inboundDataType`)}>
                        {dataTypeOptions.map((option) => (
                          <option key={option} value={option}>{option.replace("_", " ")}</option>
                        ))}
                      </Select>
                      <FieldError message={destinationErrors?.inboundDataType?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-outbound-${index}`}>Outbound data type</label>
                      <Select id={`dest-outbound-${index}`} {...register(`destinations.${index}.outboundDataType`)}>
                        {dataTypeOptions.map((option) => (
                          <option key={option} value={option}>{option.replace("_", " ")}</option>
                        ))}
                      </Select>
                      <FieldError message={destinationErrors?.outboundDataType?.message} />
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-props-${index}`}>Connector properties JSON</label>
                      <Textarea className="min-h-[160px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id={`dest-props-${index}`} spellCheck={false} {...register(`destinations.${index}.connectorProperties`)} />
                      <FieldError message={destinationErrors?.connectorProperties?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-retry-count-${index}`}>Retry count</label>
                      <Input id={`dest-retry-count-${index}`} type="number" {...register(`destinations.${index}.retryCount`, { valueAsNumber: true })} />
                      <FieldError message={destinationErrors?.retryCount?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-retry-interval-${index}`}>Retry interval (ms)</label>
                      <Input id={`dest-retry-interval-${index}`} type="number" {...register(`destinations.${index}.retryIntervalMs`, { valueAsNumber: true })} />
                      <FieldError message={destinationErrors?.retryIntervalMs?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-filter-${index}`}>Filter script</label>
                      <Textarea className="min-h-[150px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id={`dest-filter-${index}`} spellCheck={false} {...register(`destinations.${index}.filterScript`)} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-transformer-${index}`}>Transformer script</label>
                      <Textarea className="min-h-[150px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id={`dest-transformer-${index}`} spellCheck={false} {...register(`destinations.${index}.transformerScript`)} />
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-semibold text-ink" htmlFor={`dest-response-${index}`}>Response transformer</label>
                      <Textarea className="min-h-[150px] font-[family:var(--font-jetbrains)] text-[13px] leading-6" id={`dest-response-${index}`} spellCheck={false} {...register(`destinations.${index}.responseTransformerScript`)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </form>

      <ChannelFlowBlueprint channelId={channelId} values={values} />
    </div>
  );
}
