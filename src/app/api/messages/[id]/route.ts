import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/messages/[id]
 *
 * Fetch a single message with all content fields:
 * raw, transformed, encoded, sent, response, maps, errors, and metadata.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const supabase = await createClient();

    const { data: message, error } = await supabase
      .from("messages")
      .select("*")
      .or(`id.eq.${messageId},message_id.eq.${messageId}`)
      .single();

    if (error || !message) {
      return NextResponse.json(
        { error: `Message not found: ${messageId}` },
        { status: 404 }
      );
    }

    // Fetch channel name for context
    let channelName: string | null = null;
    if (message.channel_id) {
      const { data: channel } = await supabase
        .from("channels")
        .select("name")
        .eq("id", message.channel_id)
        .single();
      channelName = channel?.name || null;
    }

    return NextResponse.json({
      message: {
        ...message,
        channel_name: channelName,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Message detail error:", errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
