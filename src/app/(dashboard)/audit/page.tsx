import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buildAuditEntityHref, parseAuditAction, summarizeAuditLogs, toAuditDetailEntries } from "@/lib/audit";
import { getAuthContext } from "@/lib/authz";
import { getAuditLogs } from "@/lib/data/medflow";
import { compactNumber, formatRelativeTime } from "@/lib/utils";

const actorToneMap = {
  operator: "neutral",
  system: "gold",
} as const;

const verbToneMap = {
  archived: "gold",
  created: "good",
  deleted: "warm",
  resolved: "good",
  retried: "gold",
  tested: "neutral",
  triggered: "warm",
  updated: "neutral",
} as const;

function getVerbTone(verb: string) {
  return verbToneMap[verb as keyof typeof verbToneMap] ?? "neutral";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string; actor?: string; entity?: string; query?: string }>;
}) {
  const { operator } = await getAuthContext();
  const { activity = "all", actor = "all", entity = "all", query = "" } = await searchParams;
  const logs = await getAuditLogs();

  const summary = summarizeAuditLogs(logs);
  const entityOptions = Array.from(new Set(logs.map((log) => log.entity_type))).sort();
  const activityOptions = Array.from(new Set(logs.map((log) => parseAuditAction(log.action).verb))).sort();
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = logs.filter((log) => {
    const parsedAction = parseAuditAction(log.action);
    const actorType = log.user_id ? "operator" : "system";
    const matchesEntity = entity === "all" || log.entity_type === entity;
    const matchesActivity = activity === "all" || parsedAction.verb === activity;
    const matchesActor = actor === "all" || actorType === actor;
    const haystack = [
      log.action,
      log.entity_type,
      log.entity_id,
      log.ip_address,
      JSON.stringify(log.details ?? {}),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

    return matchesEntity && matchesActivity && matchesActor && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(145deg,rgba(12,21,29,0.98),rgba(16,50,58,0.96)_36%,rgba(71,126,112,0.9)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.25fr)_440px]">
          <div>
            <Badge className="bg-white/10 text-white" tone="neutral">Forensic event ledger</Badge>
            <h1 className="display-face mt-4 text-5xl text-white">Reconstruct every operator action, automated trigger, and downstream edge-case without leaving the timeline.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/72">MedFlow audit events are grouped here for compliance reviews, incident postmortems, and rapid operational tracebacks across channels, rules, connectors, and alerts.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="neutral">{compactNumber(summary.totalEvents)} total events</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{summary.last24Hours} in the last 24h</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{filtered.length} matching filters</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Autonomous events</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.systemEvents}</p>
              <p className="mt-2 text-sm text-white/68">Events written by the platform without a human operator attached.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Entity coverage</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.uniqueEntityTypes}</p>
              <p className="mt-2 text-sm text-white/68">Distinct MedFlow entity types represented in the current ledger.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur sm:col-span-2 xl:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Viewer context</p>
              <p className="mt-3 text-2xl font-semibold text-white">{operator?.fullName ?? "Signed-out viewer"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {operator?.role ? <Badge className="bg-white/12 text-white" tone="neutral">{operator.role}</Badge> : null}
                <p className="text-sm text-white/68">Use filters below to narrow the incident window by actor type, entity, or action.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form className="grid gap-4 md:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr_auto]" method="get">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="query">Search</label>
              <Input defaultValue={query} id="query" name="query" placeholder="Search by action, entity ID, IP, or payload detail" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="entity">Entity</label>
              <Select defaultValue={entity} id="entity" name="entity">
                <option value="all">All entities</option>
                {entityOptions.map((option) => (
                  <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="activity">Activity</label>
              <Select defaultValue={activity} id="activity" name="activity">
                <option value="all">All activity</option>
                {activityOptions.map((option) => (
                  <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="actor">Actor</label>
              <Select defaultValue={actor} id="actor" name="actor">
                <option value="all">All actors</option>
                <option value="operator">Operator</option>
                <option value="system">System</option>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <Button aria-label="Apply audit filters" type="submit">Apply</Button>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/audit">
                Reset
              </Link>
            </div>
          </form>
          <div className="rounded-[24px] border border-line-strong bg-white/70 px-4 py-3 text-sm text-muted">
            Timeline is ordered newest first and preserves raw detail fragments for operator review.
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {filtered.map((log) => {
          const action = parseAuditAction(log.action);
          const actorType = log.user_id ? "operator" : "system";
          const detailEntries = toAuditDetailEntries(log.details);
          const entityHref = buildAuditEntityHref(log);

          return (
            <Card key={log.id} className="overflow-hidden p-0">
              <div className="grid gap-0 lg:grid-cols-[148px_minmax(0,1fr)]">
                <div className="flex flex-col justify-between border-b border-line/70 bg-[radial-gradient(circle_at_top,rgba(71,126,112,0.16),rgba(17,32,42,0.02)_62%)] px-5 py-5 lg:border-b-0 lg:border-r lg:px-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recorded</p>
                    <p className="mt-3 text-sm font-semibold text-ink">{formatRelativeTime(log.created_at)}</p>
                  </div>
                  <div className="mt-5 flex items-center gap-2 lg:mt-8">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal shadow-[0_0_0_6px_rgba(71,126,112,0.12)]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{actorType}</p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge tone={getVerbTone(action.verb)}>{action.verbLabel}</Badge>
                        <Badge tone="neutral">{log.entity_type.replaceAll("_", " ")}</Badge>
                        <Badge tone={actorToneMap[actorType]}>{actorType}</Badge>
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold text-ink">{action.label}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
                        <span className="font-semibold text-ink/85">{log.entity_id ?? "No entity ID"}</span>
                        {log.ip_address ? <span>IP {log.ip_address}</span> : null}
                        {log.user_id ? <span>User {log.user_id}</span> : <span>Automated system write</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      {entityHref ? (
                        <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/82 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={entityHref}>
                          Open entity
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-[26px] border border-line-strong bg-white/76 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Detail fragments</p>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {detailEntries.length > 0 ? detailEntries.map((entry) => (
                          <div key={entry.key} className="rounded-2xl border border-line/70 bg-white/75 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{entry.label}</p>
                            <p className="mt-1 max-w-[320px] break-words text-sm font-medium text-ink">{entry.value}</p>
                          </div>
                        )) : <p className="text-sm text-muted">No structured details were captured for this event.</p>}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-[24px] border border-line-strong bg-white/76 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Action key</p>
                        <p className="mt-2 font-mono text-sm text-ink">{log.action}</p>
                      </div>
                      <div className="rounded-[24px] border border-line-strong bg-white/76 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Entity ID</p>
                        <p className="mt-2 text-sm font-semibold text-ink">{log.entity_id ?? "none"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">No audit events found</p>
          <p className="mt-3 text-base leading-7 text-muted">Broaden the filters or reset the search to reopen the wider operational trail.</p>
        </Card>
      ) : null}
    </div>
  );
}