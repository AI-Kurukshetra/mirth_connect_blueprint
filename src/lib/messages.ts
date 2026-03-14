import type { MessageRow } from "@/types/database";

export interface MessageArchiveInfo {
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  previousStatus: string | null;
}

export interface MessageSummary {
  archived: number;
  failed: number;
  inflight: number;
  total: number;
}

const inflightStatuses = new Set(["queued", "retrying", "pending"]);
const failedStatuses = new Set(["failed", "error"]);

export function getMessageArchiveInfo(message: Pick<MessageRow, "custom_metadata" | "status">): MessageArchiveInfo {
  const metadata = message.custom_metadata ?? {};

  return {
    archivedAt: typeof metadata.archivedAt === "string" ? metadata.archivedAt : null,
    archivedBy: typeof metadata.archivedBy === "string" ? metadata.archivedBy : null,
    archiveReason: typeof metadata.archiveReason === "string" ? metadata.archiveReason : null,
    previousStatus: typeof metadata.previousStatus === "string" ? metadata.previousStatus : null,
  };
}

export function summarizeMessages(messages: MessageRow[]): MessageSummary {
  return {
    archived: messages.filter((message) => message.status === "archived").length,
    failed: messages.filter((message) => failedStatuses.has(message.status)).length,
    inflight: messages.filter((message) => inflightStatuses.has(message.status)).length,
    total: messages.length,
  };
}