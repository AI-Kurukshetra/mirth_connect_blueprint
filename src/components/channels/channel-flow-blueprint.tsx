import { ArrowRight, Cable, Database, Filter, RefreshCcw, ShieldCheck, Workflow } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChannelDesignerInput } from "@/lib/validations/channel-designer";

const statusTone = {
  active: "text-teal bg-teal/10 border-teal/20",
  paused: "text-gold bg-gold/10 border-gold/20",
  inactive: "text-muted bg-white/70 border-line",
  error: "text-alert bg-alert/10 border-alert/20",
} as const;

function summarizeJson(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const entries = Object.entries(parsed).slice(0, 3);
    if (entries.length === 0) {
      return "No connector properties";
    }

    return entries.map(([key, item]) => `${key}: ${String(item)}`).join(" | ");
  } catch {
    return "Invalid connector properties";
  }
}

function scriptState(script?: string) {
  return script?.trim() ? "Configured" : "Not configured";
}

function laneHealth(destinationCount: number, retryCount: number) {
  if (retryCount >= 5) {
    return `Aggressive retry policy across ${destinationCount} lanes`;
  }

  if (destinationCount > 2) {
    return `Parallel fan-out across ${destinationCount} lanes`;
  }

  return `Focused route across ${destinationCount} lane${destinationCount === 1 ? "" : "s"}`;
}

export function ChannelFlowBlueprint({
  channelId,
  values,
}: {
  channelId: string;
  values: ChannelDesignerInput;
}) {
  const enabledDestinations = values.destinations.filter((destination) => destination.enabled);
  const activeLanes = enabledDestinations.length || values.destinations.length;

  return (
    <div className="space-y-5 xl:sticky xl:top-6">
      <section className="overflow-hidden rounded-[30px] border border-line-strong bg-[linear-gradient(145deg,rgba(18,48,58,0.98),rgba(15,109,105,0.92))] p-6 text-white shadow-[0_30px_90px_rgba(17,32,42,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/62">Live topology</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{values.name || channelId}</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/72">{values.description || "Give this lane a concise operational description so the team knows what traffic it owns."}</p>
          </div>
          <div className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", statusTone[values.status])}>
            {values.status}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/12 bg-white/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">Format</p>
            <p className="mt-2 text-lg font-semibold">{values.messageFormat.replace("_", " ")}</p>
          </div>
          <div className="rounded-[22px] border border-white/12 bg-white/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">Retries</p>
            <p className="mt-2 text-lg font-semibold">{values.retryCount} attempts / {values.retryInterval}s</p>
          </div>
          <div className="rounded-[22px] border border-white/12 bg-white/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">Traffic shape</p>
            <p className="mt-2 text-lg font-semibold">{laneHealth(activeLanes, values.retryCount)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-line-strong bg-white/78 p-6 shadow-[0_24px_72px_rgba(17,32,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Flow blueprint</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">Source to fan-out</h3>
          </div>
          <Workflow className="h-5 w-5 text-teal" />
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] border border-line-strong bg-[#f8f4ec] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/12 text-teal">
                <Cable className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Source intake</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{values.sourceConnectorType}</p>
                  </div>
                  <span className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    inbound
                  </span>
                </div>
                <p className="mt-3 font-[family:var(--font-jetbrains)] text-[12px] leading-6 text-muted">{summarizeJson(values.sourceConnectorProperties)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-4 text-muted">
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(15,109,105,0.5),rgba(17,32,42,0.12))]" />
            <ArrowRight className="h-4 w-4 text-teal" />
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(17,32,42,0.12),rgba(15,109,105,0.5))]" />
          </div>

          <div className="rounded-[24px] border border-line-strong bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/14 text-gold">
                <Workflow className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Processing stage</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">filter, transform, route</p>
                  </div>
                  <span className="rounded-full border border-line bg-[#fbf7ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                    {activeLanes} lanes
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-line bg-[#f8f4ec] px-3 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Filter className="h-4 w-4 text-gold" /> Source filter</div>
                    <p className="mt-2 text-sm text-muted">{scriptState(values.sourceFilterScript)}</p>
                  </div>
                  <div className="rounded-[18px] border border-line bg-[#f8f4ec] px-3 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink"><RefreshCcw className="h-4 w-4 text-gold" /> Source transformer</div>
                    <p className="mt-2 text-sm text-muted">{scriptState(values.sourceTransformerScript)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {values.destinations.map((destination, index) => (
              <div key={`${destination.name}-${index}`} className={cn(
                "rounded-[24px] border p-4 transition-colors",
                destination.enabled ? "border-line-strong bg-white" : "border-line bg-white/55 opacity-70",
              )}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint/28 text-teal">
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{destination.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{destination.connectorType} to {destination.outboundDataType}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                          destination.enabled ? "border-teal/20 bg-teal/10 text-teal" : "border-line bg-white text-muted",
                        )}>
                          {destination.enabled ? "enabled" : "paused"}
                        </span>
                        <span className="rounded-full border border-line bg-[#f8f4ec] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                          {destination.queueEnabled ? "queued" : "direct"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 font-[family:var(--font-jetbrains)] text-[12px] leading-6 text-muted">{summarizeJson(destination.connectorProperties)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-line-strong bg-white/74 p-6 shadow-[0_24px_72px_rgba(17,32,42,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal/10 text-teal">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Operational notes</p>
            <h3 className="mt-1 text-xl font-semibold text-ink">Save checklist</h3>
          </div>
        </div>
        <div className="mt-5 space-y-3 text-sm leading-6 text-muted">
          <p>Confirm connector property JSON is valid before saving.</p>
          <p>Keep source and destination data types aligned with the chosen message format.</p>
          <p>Use queue mode for destinations that can fail independently or need retry isolation.</p>
          <p>Preprocessor and postprocessor scripts should stay lightweight and deterministic.</p>
        </div>
      </section>
    </div>
  );
}

