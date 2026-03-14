import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMessages } from "@/lib/data/medflow";
import { formatRelativeTime } from "@/lib/utils";

const toneMap = {
  processed: "good",
  failed: "warm",
  queued: "gold",
  retrying: "neutral",
  filtered: "neutral",
} as const;

export default async function MessagesPage() {
  const messages = await getMessages();

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h1 className="display-face text-5xl text-ink">Message explorer</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Inspect inbound payloads, transformation status, processing latency, and retries.</p>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/76 text-muted">
              <tr>
                <th className="px-6 py-4 font-semibold">Message</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold">Format</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Received</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id} className="border-t border-line/80 bg-white/40">
                  <td className="px-6 py-4">
                    <Link className="font-semibold text-ink" href={`/messages/${message.message_id}`}>{message.message_id}</Link>
                    <p className="mt-1 text-sm text-muted">{message.message_type}</p>
                  </td>
                  <td className="px-6 py-4 text-muted">{message.source_system} to {message.destination_system}</td>
                  <td className="px-6 py-4 text-muted">{message.message_format}</td>
                  <td className="px-6 py-4"><Badge tone={toneMap[message.status]}>{message.status}</Badge></td>
                  <td className="px-6 py-4 text-muted">{formatRelativeTime(message.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

