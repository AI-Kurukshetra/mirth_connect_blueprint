import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { MessageRow } from "@/types/database";

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

export function RecentMessages({ messages }: { messages: MessageRow[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line/80 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Recent traffic</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Latest message outcomes</h2>
        </div>
        <Link className="text-sm font-semibold text-teal hover:text-ink" href="/messages">See all</Link>
      </div>
      <div className="divide-y divide-line/70">
        {messages.map((message) => (
          <Link key={message.id} className="grid gap-3 px-6 py-4 transition hover:bg-white/70 lg:grid-cols-[1.45fr_0.9fr_auto] lg:items-center" href={`/messages/${message.message_id}`}>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-ink">{message.message_id}</p>
                <span className="rounded-full border border-line-strong bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{message.message_format.replaceAll("_", " ")}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{message.message_type} from {message.source_system}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{message.destination_system}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{formatRelativeTime(message.created_at)}</p>
            </div>
            <Badge tone={toneMap[message.status]}>{message.status}</Badge>
          </Link>
        ))}
      </div>
    </Card>
  );
}