import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveMessageButton } from "@/components/messages/archive-message-button";
import { ReprocessButton } from "@/components/messages/reprocess-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getChannels, getMessage } from "@/lib/data/medflow";
import { getMessageArchiveInfo } from "@/lib/messages";
import { formatRelativeTime } from "@/lib/utils";

const toneMap = {
  processed: "good",
  failed: "warm",
  queued: "gold",
  retrying: "neutral",
  filtered: "neutral",
  archived: "neutral",
  received: "good",
  transformed: "good",
  sent: "good",
  error: "warm",
  pending: "gold",
} as const;

const segmentToneMap: Record<string, string> = {
  MSH: "text-sky-700",
  EVN: "text-cyan-700",
  PID: "text-emerald-700",
  PV1: "text-violet-700",
  NK1: "text-rose-700",
  ORC: "text-amber-700",
  OBR: "text-orange-700",
  OBX: "text-fuchsia-700",
};

function looksLikeHl7(payload: string) {
  return payload.startsWith("MSH|") || payload.includes("\rMSH|") || payload.includes("\nMSH|");
}

function formatPayload(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function PayloadCard({ title, payload }: { title: string; payload: string }) {
  if (looksLikeHl7(payload)) {
    return (
      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{title}</p>
        <div className="mt-4 space-y-2 rounded-[24px] border border-line-strong bg-white/80 p-4 font-[family:var(--font-jetbrains)] text-[13px] leading-6">
          {payload.split(/\r\n|\r|\n/).map((line, index) => {
            const [segment, ...rest] = line.split("|");
            return (
              <div key={`${segment}-${index}`} className="grid grid-cols-[70px_minmax(0,1fr)] gap-3">
                <span className={`font-semibold ${segmentToneMap[segment] ?? "text-ink"}`}>{segment}</span>
                <span className="overflow-x-auto text-muted">|{rest.join("|")}</span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{title}</p>
      <pre className="mt-4 overflow-x-auto rounded-[24px] border border-line-strong bg-white/80 p-4 font-[family:var(--font-jetbrains)] text-[13px] leading-6 text-ink">{formatPayload(payload)}</pre>
    </Card>
  );
}

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions, role } = await getAuthContext();
  const [message, channels] = await Promise.all([getMessage(id), getChannels()]);

  if (!message) {
    notFound();
  }

  const channel = message.channel_id ? channels.find((item) => item.id === message.channel_id || item.channel_id === message.channel_id) : null;
  const rawPayload = message.raw_content || message.raw_payload;
  const transformedPayload = message.transformed_content || message.transformed_payload;
  const responsePayload = message.response_content;
  const errorPayload = message.error_content || message.error_message;
  const metadataPayload = message.custom_metadata ? JSON.stringify(message.custom_metadata, null, 2) : null;
  const archiveInfo = getMessageArchiveInfo(message);

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge tone={toneMap[message.status]}>{message.status}</Badge>
            <h1 className="display-face mt-4 break-all text-4xl text-ink sm:text-5xl">{message.message_id}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">{message.message_type} from {message.source_system} to {message.destination_system}.</p>
            <p className="mt-2 text-sm font-semibold text-muted">Captured {formatRelativeTime(message.created_at)} in {role} access mode.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href="/messages">Back to messages</Link>
            {permissions.canCreate ? <Link className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-white/78 px-5 text-sm font-semibold text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white" href={`/simulator?channel=${channel?.channel_id ?? ""}`}>Run new test</Link> : null}
            {permissions.canEdit && message.status !== "archived" ? <ArchiveMessageButton messageId={message.message_id} /> : null}
            {permissions.canEdit && message.status !== "archived" ? <ReprocessButton messageId={message.message_id} /> : null}
          </div>
        </div>
      </Card>

      {message.status === "archived" ? (
        <Card className="border border-line-strong bg-stone-50/85 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Archive record</p>
              <p className="mt-3 text-lg font-semibold text-ink">This payload was removed from active runtime handling and preserved for operator reference.</p>
              <p className="mt-2 text-sm text-muted">{archiveInfo.archiveReason ?? "No archive reason recorded."}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted">
              {archiveInfo.previousStatus ? <span>Previous state: <span className="font-semibold text-ink">{archiveInfo.previousStatus}</span></span> : null}
              {archiveInfo.archivedAt ? <span>Archived {formatRelativeTime(archiveInfo.archivedAt)}</span> : null}
              {archiveInfo.archivedBy ? <span>By {archiveInfo.archivedBy}</span> : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Transport context</p>
          <div className="mt-5 space-y-3 text-sm">
            <p><span className="font-semibold text-ink">Channel:</span> <span className="text-muted">{channel ? `${channel.channel_id} - ${channel.name}` : "Unassigned"}</span></p>
            <p><span className="font-semibold text-ink">Connector:</span> <span className="text-muted">{message.connector_name ?? "Source"}</span></p>
            <p><span className="font-semibold text-ink">Direction:</span> <span className="text-muted">{message.direction ?? "inbound"}</span></p>
            <p><span className="font-semibold text-ink">Format:</span> <span className="text-muted">{message.message_format}</span></p>
            <p><span className="font-semibold text-ink">Data type:</span> <span className="text-muted">{message.data_type ?? "Unknown"}</span></p>
            <p><span className="font-semibold text-ink">Latency:</span> <span className="text-muted">{message.processing_time_ms ?? 0} ms</span></p>
            <p><span className="font-semibold text-ink">Created:</span> <span className="text-muted">{formatTimestamp(message.created_at)}</span></p>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Routing summary</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Source</p>
              <p className="mt-2 text-sm font-semibold text-ink">{message.source_system}</p>
            </div>
            <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Destination</p>
              <p className="mt-2 text-sm font-semibold text-ink">{message.destination_system}</p>
            </div>
            <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Retries</p>
              <p className="mt-2 text-sm font-semibold text-ink">{message.retry_attempts}</p>
            </div>
            <div className="rounded-[24px] border border-line-strong bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Current state</p>
              <p className="mt-2 text-sm font-semibold text-ink">{message.status}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {rawPayload ? <PayloadCard payload={rawPayload} title="Raw payload" /> : null}
        {transformedPayload ? <PayloadCard payload={transformedPayload} title="Transformed payload" /> : null}
        {responsePayload ? <PayloadCard payload={responsePayload} title="Response payload" /> : null}
        {errorPayload ? <PayloadCard payload={errorPayload} title="Error payload" /> : null}
        {metadataPayload ? <PayloadCard payload={metadataPayload} title="Pipeline metadata" /> : null}
      </div>
    </div>
  );
}