import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getTransformations } from "@/lib/data/medflow";
import { formatRelativeTime } from "@/lib/utils";

const resultToneMap = {
  fail: "warm",
  pass: "good",
  untested: "gold",
} as const;

const stateToneMap = {
  active: "good",
  inactive: "neutral",
} as const;

export default async function TransformationsPage({
  searchParams,
}: {
  searchParams: Promise<{ language?: string; query?: string; state?: string }>;
}) {
  const { permissions } = await getAuthContext();
  const { language = "all", query = "", state = "all" } = await searchParams;
  const [transformations, channels] = await Promise.all([getTransformations(), getChannels()]);

  const usageMap = new Map<string, number>();
  for (const channel of channels) {
    if (channel.transformation_id) {
      usageMap.set(channel.transformation_id, (usageMap.get(channel.transformation_id) ?? 0) + 1);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = transformations.filter((transformation) => {
    const matchesLanguage = language === "all" || transformation.language === language;
    const matchesState = state === "all"
      || (state === "active" && transformation.is_active)
      || (state === "inactive" && !transformation.is_active);
    const matchesQuery = !normalizedQuery || [
      transformation.transformation_id,
      transformation.name,
      transformation.description,
      transformation.input_format,
      transformation.output_format,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));

    return matchesLanguage && matchesState && matchesQuery;
  });

  const activeCount = transformations.filter((item) => item.is_active).length;
  const passingCount = transformations.filter((item) => item.test_result === "pass").length;
  const linkedCount = [...usageMap.values()].reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,rgba(225,253,248,0.95),rgba(255,255,255,0.84)_48%,rgba(188,236,232,0.62))] p-6 sm:p-8 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <div>
            <Badge tone="good">Transformation runtime</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Shape payloads before they leave the lane.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Version and operate the scripts that normalize HL7, FHIR, JSON, and XML traffic before routing fan-out.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge tone="gold">{transformations.length} total runtimes</Badge>
              <Badge tone="good">{activeCount} active</Badge>
              <Badge tone="neutral">{linkedCount} channel links</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[26px] border border-white/70 bg-white/76 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Active coverage</p>
              <p className="mt-3 text-4xl font-semibold text-ink">{activeCount}</p>
              <p className="mt-2 text-sm text-muted">Runtimes ready for channel assignment</p>
            </div>
            <div className="rounded-[26px] border border-white/70 bg-white/76 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Last test posture</p>
              <p className="mt-3 text-4xl font-semibold text-ink">{passingCount}</p>
              <p className="mt-2 text-sm text-muted">Reported a passing last test result</p>
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
          <form className="grid gap-4 md:grid-cols-[1.3fr_0.7fr_0.7fr_auto]" method="get">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="query">Search</label>
              <Input defaultValue={query} id="query" name="query" placeholder="Search by transformation ID, name, description, or format" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="language">Language</label>
              <Select defaultValue={language} id="language" name="language">
                <option value="all">All languages</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="groovy">Groovy</option>
                <option value="xslt">XSLT</option>
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
              <Button aria-label="Apply transformation filters" type="submit">Apply</Button>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/transformations">Reset</Link>
            </div>
          </form>
          {permissions.canCreate ? (
            <Link className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-teal" href="/transformations/add">
              Add transformation
            </Link>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-2">
        {filtered.map((transformation) => {
          const linkedChannels = usageMap.get(transformation.id) ?? 0;

          return (
            <Card key={transformation.id} className="overflow-hidden p-0">
              <div className="border-b border-line/70 bg-white/72 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={transformation.is_active ? stateToneMap.active : stateToneMap.inactive}>{transformation.is_active ? "active" : "inactive"}</Badge>
                      <Badge tone={resultToneMap[transformation.test_result ?? "untested"]}>{transformation.test_result ?? "untested"}</Badge>
                      <Badge tone="gold">v{transformation.version}</Badge>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-ink">{transformation.name}</h2>
                    <p className="mt-2 text-sm uppercase tracking-[0.18em] text-muted">{transformation.transformation_id}</p>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{transformation.description ?? "No operator notes were added for this runtime yet."}</p>
                  </div>
                  {permissions.canEdit ? (
                    <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/transformations/${transformation.transformation_id}/edit`}>
                      Open editor
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted">
                    <span>{transformation.input_format ?? "Unknown"}</span>
                    <span aria-hidden="true">to</span>
                    <span>{transformation.output_format ?? "Unknown"}</span>
                    <span aria-hidden="true">/</span>
                    <span>{transformation.language}</span>
                  </div>
                  <pre className="mt-4 max-h-[220px] overflow-auto rounded-[24px] bg-[linear-gradient(145deg,rgba(17,32,42,0.96),rgba(0,116,122,0.92))] p-5 text-xs leading-6 text-white/85">{transformation.script}</pre>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Linked channels</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{linkedChannels}</p>
                    <p className="text-sm text-muted">channels currently use this runtime</p>
                  </div>
                  <div className="rounded-[24px] border border-line-strong bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Last tested</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{transformation.last_tested_at ? formatRelativeTime(transformation.last_tested_at) : "Not tested yet"}</p>
                    <p className="mt-2 text-sm text-muted">Update the script when downstream payload contracts change.</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">No transformations found</p>
          <p className="mt-3 text-base leading-7 text-muted">Adjust the filters or create a new runtime to start shaping traffic.</p>
        </Card>
      ) : null}
    </div>
  );
}
