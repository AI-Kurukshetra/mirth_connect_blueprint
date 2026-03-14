import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processMessage } from "@/lib/engine/pipeline";

/**
 * POST /api/channels/[id]/process
 *
 * Send a message to a channel for processing through the pipeline.
 * Accepts: { message: string }
 * Returns: Full ProcessResult with all intermediate states.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'message' field. Must be a non-empty string." },
        { status: 400 }
      );
    }

    if (!channelId) {
      return NextResponse.json(
        { error: "Missing channel ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, name, enabled")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: `Channel not found: ${channelId}` },
        { status: 404 }
      );
    }

    if (channel.enabled === false) {
      return NextResponse.json(
        { error: `Channel '${channel.name}' is disabled.` },
        { status: 422 }
      );
    }

    // Process message through the pipeline
    const result = await processMessage(channelId, message, supabase);

    return NextResponse.json({
      success: result.status !== "error",
      result,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Channel process error:", errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
