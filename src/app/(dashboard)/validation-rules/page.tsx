import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getValidationRules } from "@/lib/data/medflow";
import { formatRelativeTime } from "@/lib/utils";

const severityToneMap = {
  error: "warm",
  warning: "gold",
  info: "neutral",
} as const;

const stateToneMap = {
  active: "good",
  inactive: "neutral",
} as const;

export default async function ValidationRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; query?: string; severity?: string; state?: string }>;
}) {
  const { permissions } = await getAuthContext();
  const { format = "all", query = "", severity = "all", state = "all" } = await searchParams;
  const [rules, channels] = await Promise.all([getValidationRules(), getChannels()]);

  const usageMap = new Map<string, number>();
  for (const channel of channels) {
    if (channel.validation_rule_id) {
      usageMap.set(channel.validation_rule_id, (usageMap.get(channel.validation_rule_id) ?? 0) + 1);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = rules.filter((rule) => {
    const matchesFormat = format === "all" || rule.message_format === format;
    const matchesSeverity = severity === "all" || rule.severity === severity;
    const matchesState = state === "all" || (state === "active" && rule.is_active) || (state === "inactive" && !rule.is_active);
    const matchesQuery = !normalizedQuery || [rule.rule_id, rule.name, rule.description, rule.rule_type].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));

    return matchesFormat && matchesSeverity && matchesState && matchesQuery;
  });

  const activeCount = rules.filter((rule) => rule.is_active).length;
  const linkedCount = [...usageMap.values()].reduce((sum, count) => sum + count, 0);
  const errorCount = rules.filter((rule) => rule.severity === "error").length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,rgba(236,245,255,0.95),rgba(255,255,255,0.84)_46%,rgba(206,224,255,0.62))] p-6 sm:p-8 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <div>
            <Badge tone="good">Validation engine</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Gate payload quality before routing fan-out.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Define schema, field, format, and custom JSON rules that protect downstream systems from malformed traffic.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge tone="gold">{rules.length} total rules</Badge>
              <Badge tone="good">{activeCount} active</Badge>
              <Badge tone="neutral">{linkedCount} channel links</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/70 bg-white/76 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Active coverage</p>
              <p className="mt-3 text-4xl font-semibold text-ink">{activeCount}</p>
              <p className="mt-2 text-sm text-muted">Rules ready for runtime enforcement</p>
            </div>
            <div className="rounded-[26px] border border-white/70 bg-white/76 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Error blockers</p>
              <p className="mt-3 text-4xl font-semibold text-ink">{errorCount}</p>
              <p className="mt-2 text-sm text-muted">Rules that stop messages on hard failure</p>
            </div>
            <div className="rounded-[26px] border border-white/70 bg-white/76 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Linked lanes</p>
              <p className="mt-3 text-4xl font-semibold text-ink">{linkedCount}</p>
              <p className="mt-2 text-sm text-muted">Current channel assignments across MedFlow</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form className="grid gap-4 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto]" method="get">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="query">Search</label>
              <Input defaultValue={query} id="query" name="query" placeholder="Search by rule ID, name, type, or description" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="format">Format</label>
              <Select defaultValue={format} id="format" name="format">
                <option value="all">All formats</option>
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
              <label className="text-sm font-semibold text-ink" htmlFor="severity">Severity</label>
              <Select defaultValue={severity} id="severity" name="severity">
                <option value="all">All severities</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="state">State</label>
              <Select defaultValue={state} id="state" name="state">
                <option value="all">All states</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <Button aria-label="Apply validation rule filters" type="submit">Apply</Button>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/validation-rules">Reset</Link>
            </div>
          </form>
          {permissions.canCreate ? (
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href="/validation-rules/add">
              Add validation rule
            </Link>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-2">
        {filtered.map((rule) => {
          const linkedChannels = usageMap.get(rule.id) ?? 0;
          const definitionPreview = JSON.stringify(rule.rule_definition, null, 2);

          return (
            <Card key={rule.id} className="overflow-hidden p-0">
              <div className="border-b border-line/70 bg-white/72 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={rule.is_active ? stateToneMap.active : stateToneMap.inactive}>{rule.is_active ? "active" : "inactive"}</Badge>
                      <Badge tone={severityToneMap[rule.severity]}>{rule.severity}</Badge>
                      <Badge tone="neutral">{rule.rule_type.replaceAll("_", " ")}</Badge>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-ink">{rule.name}</h2>
                    <p className="mt-2 text-sm uppercase tracking-[0.18em] text-muted">{rule.rule_id}</p>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{rule.description ?? "No operator notes were added for this rule yet."}</p>
                  </div>
                  {permissions.canEdit ? (
                    <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/validation-rules/${rule.rule_id}/edit`}>
                      Open editor
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted">
                    <span>{rule.message_format}</span>
                    <span aria-hidden="true">/</span>
                    <span>{rule.rule_type.replaceAll("_", " ")}</span>
                  </div>
                  <pre className="mt-4 max-h-[220px] overflow-auto rounded-[24px] bg-[linear-gradient(145deg,rgba(17,32,42,0.96),rgba(73,99,138,0.92))] p-5 text-xs leading-6 text-white/85">{definitionPreview}</pre>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Linked channels</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{linkedChannels}</p>
                    <p className="text-sm text-muted">channels currently enforce this rule</p>
                  </div>
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Last updated</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{formatRelativeTime(rule.updated_at)}</p>
                    <p className="mt-2 text-sm text-muted">Tune the definition when payload contracts or downstream expectations change.</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">No validation rules found</p>
          <p className="mt-3 text-base leading-7 text-muted">Adjust the filters or create a new rule to start gating traffic.</p>
        </Card>
      ) : null}
    </div>
  );
}
