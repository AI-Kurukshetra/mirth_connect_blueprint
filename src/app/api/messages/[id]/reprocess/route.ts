import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { processMessage } from "@/lib/engine/pipeline";

/**
 * POST /api/messages/[id]/reprocess
 *
 * Reprocess a message through its original channel.
 * Fetches the original raw_content and channel_id, then runs the pipeline again.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    const access = await requireRole(["admin", "engineer"]);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const { supabase } = access;

    const { data: originalMessage, error: fetchError } = await supabase
      .from("messages")
      .select("id, message_id, channel_id, raw_content, raw_payload, status, custom_metadata")
      .or(`id.eq.${messageId},message_id.eq.${messageId}`)
      .single();

    if (fetchError || !originalMessage) {
      return NextResponse.json(
        { error: `Message not found: ${messageId}` },
        { status: 404 },
      );
    }

    const rawContent = originalMessage.raw_content || originalMessage.raw_payload;

    if (!rawContent) {
      return NextResponse.json(
        { error: "Original message has no raw content to reprocess." },
        { status: 422 },
      );
    }

    if (!originalMessage.channel_id) {
      return NextResponse.json(
        { error: "Original message has no associated channel." },
        { status: 422 },
      );
    }

    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, name, enabled")
      .or(`id.eq.${originalMessage.channel_id},channel_id.eq.${originalMessage.channel_id}`)
      .single();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: `Original channel no longer exists: ${originalMessage.channel_id}` },
        { status: 404 },
      );
    }

    const result = await processMessage(channel.id, rawContent, supabase);

    await supabase
      .from("messages")
      .update({
        custom_metadata: {
          ...(originalMessage.custom_metadata ?? {}),
          reprocessed: true,
          reprocessedAt: new Date().toISOString(),
          newMessageId: result.messageId,
        },
      })
      .eq("id", originalMessage.id);

    return NextResponse.json({
      success: result.status !== "error",
      originalMessageId: messageId,
      result,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Reprocess error:", errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 },
    );
  }
}
