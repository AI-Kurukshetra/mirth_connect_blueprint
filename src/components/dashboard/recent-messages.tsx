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
} as const;

export function RecentMessages({ messages }: { messages: MessageRow[] }) {
  return (
    <Card className="p-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Recent traffic</p>
          <h2 className="display-face mt-2 text-3xl text-ink">Message pulse</h2>
        </div>
        <Link className="text-sm font-semibold text-teal" href="/messages">Open stream</Link>
      </div>

      <div className="mt-6 space-y-3">
        {messages.map((message) => (
          <Link
            key={message.message_id}
            className="block rounded-[24px] border border-line-strong bg-white/76 px-4 py-4 hover:-translate-y-0.5 hover:border-ink/20"
            href={`/messages/${message.message_id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">{message.message_id} - {message.message_type}</p>
                <p className="mt-1 text-sm text-muted">{message.source_system} to {message.destination_system}</p>
              </div>
              <Badge tone={toneMap[message.status]}>{message.status}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-muted">
              <span>{message.message_format}</span>
              <span>{formatRelativeTime(message.created_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

