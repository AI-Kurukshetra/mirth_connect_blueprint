import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processMessage } from "@/lib/engine/pipeline";

/**
 * POST /api/messages/[id]/reprocess
 *
 * Reprocess a message through its original channel.
 * Fetches the original raw_content and channel_id, then runs the pipeline again.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const supabase = await createClient();

    // Fetch the original message
    const { data: originalMessage, error: fetchError } = await supabase
      .from("messages")
      .select("id, channel_id, raw_content, status")
      .eq("id", messageId)
      .single();

    if (fetchError || !originalMessage) {
      return NextResponse.json(
        { error: `Message not found: ${messageId}` },
        { status: 404 }
      );
    }

    if (!originalMessage.raw_content) {
      return NextResponse.json(
        { error: "Original message has no raw content to reprocess." },
        { status: 422 }
      );
    }

    if (!originalMessage.channel_id) {
      return NextResponse.json(
        { error: "Original message has no associated channel." },
        { status: 422 }
      );
    }

    // Verify channel still exists
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, name, enabled")
      .eq("id", originalMessage.channel_id)
      .single();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: `Original channel no longer exists: ${originalMessage.channel_id}` },
        { status: 404 }
      );
    }

    // Reprocess through the pipeline
    const result = await processMessage(
      originalMessage.channel_id,
      originalMessage.raw_content,
      supabase
    );

    // Update original message status to indicate it was reprocessed
    await supabase
      .from("messages")
      .update({
        custom_metadata: {
          reprocessed: true,
          reprocessedAt: new Date().toISOString(),
          newMessageId: result.messageId,
        },
      })
      .eq("id", messageId);

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
      { status: 500 }
    );
  }
}
