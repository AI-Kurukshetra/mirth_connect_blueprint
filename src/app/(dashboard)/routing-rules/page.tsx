import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getRoutingRules } from "@/lib/data/medflow";
import { formatRelativeTime } from "@/lib/utils";

const actionToneMap = {
  route_to: "good",
  filter: "gold",
  transform: "neutral",
  duplicate: "neutral",
  archive: "warm",
} as const;

const stateToneMap = {
  active: "good",
  inactive: "neutral",
} as const;

export default async function RoutingRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; query?: string; state?: string; source?: string }>;
}) {
  const { permissions } = await getAuthContext();
  const { action = "all", query = "", state = "all", source = "all" } = await searchParams;
  const [rules, channels] = await Promise.all([getRoutingRules(), getChannels()]);

  const channelMap = new Map(channels.map((channel) => [channel.id, channel]));
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = rules.filter((rule) => {
    const sourceChannel = rule.channel_id ? channelMap.get(rule.channel_id) : null;
    const matchesAction = action === "all" || rule.action === action;
    const matchesState = state === "all" || (state === "active" && rule.is_active) || (state === "inactive" && !rule.is_active);
    const matchesSource = source === "all" || sourceChannel?.channel_id === source;
    const matchesQuery = !normalizedQuery || [rule.rule_id, rule.name, rule.description, rule.condition_field, rule.condition_value].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));

    return matchesAction && matchesState && matchesSource && matchesQuery;
  });

  const activeCount = rules.filter((rule) => rule.is_active).length;
  const branchingCount = rules.filter((rule) => rule.action === "route_to" || rule.action === "duplicate").length;
  const archiveCount = rules.filter((rule) => rule.action === "archive").length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,rgba(244,250,236,0.95),rgba(255,255,255,0.84)_46%,rgba(219,236,199,0.62))] p-6 sm:p-8 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <div>
            <Badge tone="good">Routing engine</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Branch traffic with explicit operational intent.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Define rule priority, branch conditions, and destination lanes so MedFlow routes each payload through a deliberate decision tree.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge tone="gold">{rules.length} total rules</Badge>
              <Badge tone="good">{activeCount} active</Badge>
              <Badge tone="neutral">{branchingCount} branching rules</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/70 bg-white/76 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Active coverage</p>
              <p className="mt-3 text-4xl font-semibold text-ink">{activeCount}</p>
              <p className="mt-2 text-sm text-muted">Rules participating in live routing decisions</p>
            </div>
            <div className="rounded-[26px] border border-white/70 bg-white/76 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Branch routes</p>
              <p className="mt-3 text-4xl font-semibold text-ink">{branchingCount}</p>
              <p className="mt-2 text-sm text-muted">Rules that fan traffic into another lane</p>
            </div>
            <div className="rounded-[26px] border border-white/70 bg-white/76 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Archive sinks</p>
              <p className="mt-3 text-4xl font-semibold text-ink">{archiveCount}</p>
              <p className="mt-2 text-sm text-muted">Rules that stop or archive problematic traffic</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form className="grid gap-4 md:grid-cols-[1.3fr_0.7fr_0.8fr_0.9fr_auto]" method="get">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="query">Search</label>
              <Input defaultValue={query} id="query" name="query" placeholder="Search by rule ID, name, field, or description" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="action">Action</label>
              <Select defaultValue={action} id="action" name="action">
                <option value="all">All actions</option>
                <option value="route_to">Route to</option>
                <option value="filter">Filter</option>
                <option value="transform">Transform</option>
                <option value="duplicate">Duplicate</option>
                <option value="archive">Archive</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="source">Source lane</label>
              <Select defaultValue={source} id="source" name="source">
                <option value="all">All lanes</option>
                {channels.map((channel) => (
                  <option key={channel.channel_id} value={channel.channel_id}>{channel.channel_id}</option>
                ))}
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
              <Button aria-label="Apply routing rule filters" type="submit">Apply</Button>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/routing-rules">Reset</Link>
            </div>
          </form>
          {permissions.canCreate ? (
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href="/routing-rules/add">
              Add routing rule
            </Link>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-2">
        {filtered.map((rule) => {
          const sourceChannel = rule.channel_id ? channelMap.get(rule.channel_id) : null;
          const destinationChannel = rule.destination_channel_id ? channelMap.get(rule.destination_channel_id) : null;

          return (
            <Card key={rule.id} className="overflow-hidden p-0">
              <div className="border-b border-line/70 bg-white/72 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={rule.is_active ? stateToneMap.active : stateToneMap.inactive}>{rule.is_active ? "active" : "inactive"}</Badge>
                      <Badge tone={actionToneMap[rule.action]}>{rule.action.replaceAll("_", " ")}</Badge>
                      <Badge tone="neutral">priority {rule.priority}</Badge>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-ink">{rule.name}</h2>
                    <p className="mt-2 text-sm uppercase tracking-[0.18em] text-muted">{rule.rule_id}</p>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{rule.description ?? "No operator notes were added for this routing rule yet."}</p>
                  </div>
                  {permissions.canEdit ? (
                    <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/routing-rules/${rule.rule_id}/edit`}>
                      Open editor
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Decision path</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div className="rounded-[18px] border border-line-strong bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{sourceChannel?.name ?? "Unassigned source"}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{sourceChannel?.channel_id ?? "source"}</p>
                      </div>
                      <div className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                        {rule.condition_type.replaceAll("_", " ")} / {rule.action.replaceAll("_", " ")}
                      </div>
                      <div className="rounded-[18px] border border-line-strong bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{destinationChannel?.name ?? (rule.destination_channel_id ? "Destination unavailable" : "No destination channel")}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{destinationChannel?.channel_id ?? "destination"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[24px] border border-line-strong bg-[linear-gradient(145deg,rgba(17,32,42,0.96),rgba(56,79,102,0.92))] p-5 text-xs leading-6 text-white/85">
                    <p><span className="font-semibold text-white">Field:</span> {rule.condition_field ?? "n/a"}</p>
                    <p className="mt-2"><span className="font-semibold text-white">Operator:</span> {rule.condition_operator ?? "n/a"}</p>
                    <p className="mt-2"><span className="font-semibold text-white">Value:</span> {rule.condition_value ?? "n/a"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Source lane</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{sourceChannel?.channel_id ?? "Unassigned"}</p>
                    <p className="text-sm text-muted">{sourceChannel?.name ?? "No source lane bound"}</p>
                  </div>
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Last updated</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{formatRelativeTime(rule.updated_at)}</p>
                    <p className="mt-2 text-sm text-muted">Rebalance rule order when upstream payload mixes change.</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">No routing rules found</p>
          <p className="mt-3 text-base leading-7 text-muted">Adjust the filters or create a new rule to start branching traffic.</p>
        </Card>
      ) : null}
    </div>
  );
}
