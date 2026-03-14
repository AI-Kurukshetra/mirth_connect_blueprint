import Link from "next/link";

import { ResolveErrorButton } from "@/components/errors/resolve-error-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getErrorLogs, getMessages } from "@/lib/data/medflow";
import { getErrorSeverity, summarizeErrorLogs } from "@/lib/errors";
import { formatRelativeTime } from "@/lib/utils";

const severityToneMap = {
  critical: "warm",
  high: "warm",
  medium: "gold",
  low: "neutral",
} as const;

const stateToneMap = {
  open: "warm",
  resolved: "good",
} as const;

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; severity?: string; state?: string; type?: string }>;
}) {
  const { permissions } = await getAuthContext();
  const { query = "", severity = "all", state = "all", type = "all" } = await searchParams;
  const [errors, channels, messages] = await Promise.all([getErrorLogs(), getChannels(), getMessages()]);

  const summary = summarizeErrorLogs(errors);
  const channelMap = new Map(channels.flatMap((channel) => [[channel.id, channel], [channel.channel_id, channel]]));
  const messageMap = new Map(messages.flatMap((message) => [[message.id, message], [message.message_id, message]]));
  const typeOptions = Array.from(new Set(errors.map((error) => error.error_type))).sort();
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = errors.filter((error) => {
    const severityLevel = getErrorSeverity(error);
    const channel = error.channel_id ? channelMap.get(error.channel_id) : null;
    const message = error.message_id ? messageMap.get(error.message_id) : null;
    const matchesSeverity = severity === "all" || severityLevel === severity;
    const matchesState = state === "all" || (state === "open" && !error.resolved) || (state === "resolved" && error.resolved);
    const matchesType = type === "all" || error.error_type === type;
    const haystack = [
      error.error_code,
      error.error_type,
      error.error_message,
      error.stack_trace,
      channel?.channel_id,
      channel?.name,
      message?.message_id,
      message?.source_system,
      message?.destination_system,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

    return matchesSeverity && matchesState && matchesType && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[linear-gradient(140deg,rgba(28,18,17,0.98),rgba(94,45,29,0.95)_42%,rgba(207,106,65,0.9)_100%)] p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <div>
            <Badge className="bg-white/10 text-white" tone="neutral">Incident triage board</Badge>
            <h1 className="display-face mt-4 text-5xl text-white">Pin the failing lane, inspect the blast radius, and close the incident from one surface.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/74">Operational defects, transport faults, expired credentials, and replay issues stay grouped here with quick links back to the affected channel and message context.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white" tone="neutral">{summary.total} total incidents</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{summary.open} currently open</Badge>
              <Badge className="bg-white/12 text-white" tone="neutral">{filtered.length} matching filters</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Critical open</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.critical}</p>
              <p className="mt-2 text-sm text-white/68">Unresolved incidents with network or security-level failure signatures.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Affected lanes</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.affectedChannels}</p>
              <p className="mt-2 text-sm text-white/68">Distinct channels that currently have unresolved incidents attached.</p>
            </div>
            <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur sm:col-span-2 xl:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Resolved ledger</p>
              <p className="mt-3 text-4xl font-semibold text-white">{summary.resolved}</p>
              <p className="mt-2 text-sm text-white/68">Historical incident records kept for audit and operational learning.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form className="grid gap-4 md:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_auto]" method="get">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="query">Search</label>
              <Input defaultValue={query} id="query" name="query" placeholder="Search by code, message, lane, or payload fault" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="severity">Severity</label>
              <Select defaultValue={severity} id="severity" name="severity">
                <option value="all">All severity</option>
                <option value="critical">critical</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="type">Type</label>
              <Select defaultValue={type} id="type" name="type">
                <option value="all">All types</option>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="state">State</label>
              <Select defaultValue={state} id="state" name="state">
                <option value="all">All states</option>
                <option value="open">Open only</option>
                <option value="resolved">Resolved only</option>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <Button aria-label="Apply error filters" type="submit">Apply</Button>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/errors">
                Reset
              </Link>
            </div>
          </form>
          <div className="rounded-[24px] border border-line-strong bg-white/70 px-4 py-3 text-sm text-muted">
            Resolve actions are available to engineer and admin roles only.
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {filtered.map((error) => {
          const severityLevel = getErrorSeverity(error);
          const channel = error.channel_id ? channelMap.get(error.channel_id) : null;
          const message = error.message_id ? messageMap.get(error.message_id) : null;
          const status = error.resolved ? "resolved" : "open";
          const messageHref = message ? `/messages/${message.message_id}` : null;
          const channelHref = channel ? `/channels/${channel.channel_id}` : null;

          return (
            <Card key={error.id} className="overflow-hidden p-0">
              <div className="border-b border-line/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,236,230,0.7))] px-6 py-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={stateToneMap[status]}>{status}</Badge>
                      <Badge tone={severityToneMap[severityLevel]}>{severityLevel}</Badge>
                      <Badge tone="neutral">{error.error_type}</Badge>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-ink">{error.error_code}</h2>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">{error.error_message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                      <span>{formatRelativeTime(error.created_at)}</span>
                      {error.resolved_at ? <span>resolved {formatRelativeTime(error.resolved_at)}</span> : null}
                      {error.resolved_by ? <span>by {error.resolved_by}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    {channelHref ? (
                      <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/82 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={channelHref}>
                        Open channel
                      </Link>
                    ) : null}
                    {messageHref ? (
                      <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/82 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={messageHref}>
                        Open message
                      </Link>
                    ) : null}
                    {!error.resolved && permissions.canEdit ? <ResolveErrorButton errorCode={error.error_code} errorId={error.id} /> : null}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 px-6 py-5 xl:grid-cols-[220px_220px_minmax(0,1fr)]">
                <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Impacted lane</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{channel?.channel_id ?? "Unassigned"}</p>
                  <p className="mt-2 text-sm text-muted">{channel?.name ?? "No channel link was captured for this incident."}</p>
                </div>
                <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Message trace</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{message?.message_id ?? "No message"}</p>
                  <p className="mt-2 text-sm text-muted">{message ? `${message.source_system} to ${message.destination_system}` : "This incident was recorded outside a single message context."}</p>
                </div>
                <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Failure trace</p>
                  {error.stack_trace ? (
                    <pre className="mt-3 overflow-x-auto rounded-2xl bg-ink px-4 py-3 text-xs leading-6 text-white/84">{error.stack_trace}</pre>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-muted">No stack trace was captured for this incident. The operator should use the message payload and linked lane to continue diagnosis.</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">No incidents found</p>
          <p className="mt-3 text-base leading-7 text-muted">Broaden the filters or reset the search to reopen the full incident ledger.</p>
        </Card>
      ) : null}
    </div>
  );
}