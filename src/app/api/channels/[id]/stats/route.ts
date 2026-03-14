import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/channels/[id]/stats
 *
 * Fetch channel statistics: message counts by status, total messages,
 * average processing time, and recent activity.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const supabase = await createClient();

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, name")
      .or(`id.eq.${channelId},channel_id.eq.${channelId}`)
      .single();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: `Channel not found: ${channelId}` },
        { status: 404 }
      );
    }

    // Get all messages for this channel
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("status, processing_time_ms, direction, created_at")
      .eq("channel_id", channel.id);

    if (messagesError) {
      return NextResponse.json(
        { error: `Failed to fetch messages: ${messagesError.message}` },
        { status: 500 }
      );
    }

    const allMessages = messages || [];

    // Count by status
    const statusCounts: Record<string, number> = {
      received: 0,
      transformed: 0,
      filtered: 0,
      sent: 0,
      queued: 0,
      error: 0,
      pending: 0,
    };

    let totalProcessingTime = 0;
    let processedCount = 0;
    const directionCounts: Record<string, number> = { inbound: 0, outbound: 0 };

    for (const msg of allMessages) {
      if (msg.status && statusCounts[msg.status] !== undefined) {
        statusCounts[msg.status]++;
      }
      if (msg.processing_time_ms) {
        totalProcessingTime += msg.processing_time_ms;
        processedCount++;
      }
      if (msg.direction) {
        directionCounts[msg.direction] = (directionCounts[msg.direction] || 0) + 1;
      }
    }

    const avgProcessingTime =
      processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0;

    // Recent activity: count messages in last hour, last 24 hours
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const lastHourCount = allMessages.filter(
      (m) => new Date(m.created_at) >= oneHourAgo
    ).length;
    const lastDayCount = allMessages.filter(
      (m) => new Date(m.created_at) >= oneDayAgo
    ).length;

    return NextResponse.json({
      channelId: channel.id,
      channelName: channel.name,
      totalMessages: allMessages.length,
      statusCounts,
      directionCounts,
      avgProcessingTimeMs: avgProcessingTime,
      recentActivity: {
        lastHour: lastHourCount,
        last24Hours: lastDayCount,
      },
      errorRate:
        allMessages.length > 0
          ? Math.round((statusCounts.error / allMessages.length) * 10000) / 100
          : 0,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Channel stats error:", errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
