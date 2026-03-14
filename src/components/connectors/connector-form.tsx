"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createConnectorAction, updateConnectorAction } from "@/lib/actions/connectors";
import {
  connectorAuthMethods,
  connectorDirections,
  connectorSchema,
  connectorStatuses,
  connectorTypes,
  type ConnectorInput,
} from "@/lib/validations/connector";
import { useUiStore } from "@/store/ui-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { TestConnectorButton } from "./test-connector-button";

interface ConnectorFormProps {
  currentConnectorId?: string;
  initialValues?: ConnectorInput;
  mode?: "create" | "edit";
}

const defaultValues: ConnectorInput = {
  connectorId: "CON-007",
  name: "",
  type: "REST",
  direction: "destination",
  host: "",
  port: 443,
  pathOrQueue: "",
  authMethod: "token",
  status: "testing",
};

const statusToneMap = {
  connected: "good",
  disconnected: "gold",
  error: "warm",
  testing: "neutral",
} as const;

const directionCopy = {
  source: "Receives traffic into MedFlow.",
  destination: "Hands transformed traffic to a downstream system.",
  bidirectional: "Supports request and response loops across both directions.",
} as const;

const connectorPlaybooks = {
  MLLP: "Use for classic HL7 admission, orders, and result traffic where socket posture matters.",
  HTTP: "Use for general webhook or HTTP-based endpoints that need predictable headers and retries.",
  SFTP: "Use for scheduled drops, batch exports, and file-based handoffs.",
  TCP: "Use for custom socket payloads where framing is controlled externally.",
  Database: "Use for direct persistence targets or ingestion sidecars that land in SQL.",
  REST: "Use for FHIR or JSON APIs with auth tokens and downstream contract versioning.",
  SOAP: "Use for older enterprise payload contracts that still depend on SOAP envelopes.",
  File: "Use for local queue folders or file drops when transport is handled outside MedFlow.",
} as const;

export function ConnectorForm({ currentConnectorId, initialValues, mode = "create" }: ConnectorFormProps) {
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
  } = useForm<ConnectorInput>({
    defaultValues: initialValues ?? defaultValues,
    resolver: zodResolver(connectorSchema),
  });

  const type = watch("type");
  const direction = watch("direction");
  const status = watch("status");
  const host = watch("host");
  const port = watch("port");
  const pathOrQueue = watch("pathOrQueue");
  const authMethod = watch("authMethod");
  const endpointLabel = type === "File"
    ? (pathOrQueue || "Path pending")
    : `${host || "Host pending"}${port ? `:${port}` : ""}`;

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading(mode === "create" ? "Provisioning connector endpoint..." : "Updating connector endpoint...");
      try {
        const result = mode === "edit" && currentConnectorId
          ? await updateConnectorAction(currentConnectorId, values)
          : await createConnectorAction(values);

        setServerMessage(result.message);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push(result.redirectTo ?? "/connectors");
        router.refresh();
      } finally {
        stopLoading();
      }
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-3 border-b border-line/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{mode === "create" ? "Create connector" : "Edit connector"}</p>
              <h2 className="display-face mt-3 text-4xl text-ink">Wire the system edge with real operational posture.</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={statusToneMap[status]}>{status}</Badge>
              <Badge tone="neutral">{direction}</Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="connectorId">Connector ID</label>
              <Input aria-label="Connector ID" id="connectorId" {...register("connectorId")} />
              {errors.connectorId ? <p className="text-sm text-alert">{errors.connectorId.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="name">Name</label>
              <Input aria-label="Connector name" id="name" {...register("name")} />
              {errors.name ? <p className="text-sm text-alert">{errors.name.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-semibold text-ink" htmlFor="type">Connector type</label>
              <Select aria-label="Connector type" id="type" {...register("type")}>
                {connectorTypes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="direction">Direction</label>
              <Select aria-label="Connector direction" id="direction" {...register("direction")}>
                {connectorDirections.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="status">Runtime state</label>
              <Select aria-label="Connector runtime state" id="status" {...register("status")}>
                {connectorStatuses.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="host">Host or endpoint</label>
              <Input aria-label="Connector host" id="host" placeholder={type === "File" ? "Optional for file connectors" : "api.system.local"} {...register("host")} />
              {errors.host ? <p className="text-sm text-alert">{errors.host.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="port">Port</label>
              <Input aria-label="Connector port" id="port" type="number" {...register("port", { valueAsNumber: true })} />
              {errors.port ? <p className="text-sm text-alert">{errors.port.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="pathOrQueue">Path or queue</label>
              <Input aria-label="Connector path or queue" id="pathOrQueue" placeholder={type === "File" ? "\\\\server\\drop\\adt" : "/fhir/Patient or queue.medflow.hl7"} {...register("pathOrQueue")} />
              {errors.pathOrQueue ? <p className="text-sm text-alert">{errors.pathOrQueue.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="authMethod">Authentication</label>
              <Select aria-label="Connector authentication" id="authMethod" {...register("authMethod")}>
                {connectorAuthMethods.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="rounded-[28px] border border-line-strong bg-white/72 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Connection intent</p>
                <p className="mt-1 text-sm leading-6 text-muted">{directionCopy[direction]}</p>
              </div>
              <div className="rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-ink">
                {type} / {authMethod}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="bg-[linear-gradient(155deg,rgba(17,32,42,0.96),rgba(0,116,122,0.88))] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Endpoint preview</p>
              <p className="mt-4 text-3xl font-semibold">{endpointLabel}</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/74">{connectorPlaybooks[type]}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[24px] border border-white/14 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Direction</p>
                  <p className="mt-2 text-lg font-semibold">{direction}</p>
                </div>
                <div className="rounded-[24px] border border-white/14 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Auth posture</p>
                  <p className="mt-2 text-lg font-semibold">{authMethod}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Operator playbook</p>
                <p className="mt-1 text-sm leading-6 text-muted">Keep connector state aligned with downstream availability and security requirements.</p>
              </div>
              <div className={`flex h-20 w-20 items-center justify-center rounded-full border-[10px] ${status === "connected" ? "border-mint/50 bg-mint/12 text-teal" : status === "error" ? "border-alert/40 bg-alert/10 text-alert" : status === "disconnected" ? "border-gold/40 bg-gold/10 text-gold" : "border-ink/15 bg-ink/5 text-ink"}`}>
                <span className="text-sm font-semibold uppercase tracking-[0.14em]">{status}</span>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>Test connectors after any hostname, auth, or route change so audit trails stay trustworthy.</li>
              <li>Use bidirectional connectors only where response handling is genuinely required.</li>
              <li>Prefer explicit path or queue names when the downstream endpoint serves multiple logical lanes.</li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : <p className="text-sm text-muted">Every save is validated on the client and the server before persistence.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button aria-label="Return to connectors" type="button" variant="secondary" onClick={() => router.push("/connectors")}>Back to connectors</Button>
          {mode === "edit" && currentConnectorId ? <TestConnectorButton connectorId={currentConnectorId} /> : null}
          <Button aria-label={mode === "create" ? "Create connector" : "Save connector changes"} loading={isPending} loadingText={mode === "create" ? "Creating connector..." : "Saving changes..."} type="submit">
            {mode === "create" ? "Create connector" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}