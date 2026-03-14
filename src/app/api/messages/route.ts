import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/messages
 *
 * Search and list messages with filtering and pagination.
 *
 * Query params:
 *   - channel_id: UUID - filter by channel
 *   - status: string - filter by status (received, transformed, filtered, sent, queued, error, pending)
 *   - direction: string - filter by direction (inbound, outbound)
 *   - limit: number - max results (default 50, max 200)
 *   - offset: number - pagination offset (default 0)
 *   - from_date: ISO string - messages created after this date
 *   - to_date: ISO string - messages created before this date
 *   - connector_name: string - filter by connector name
 *   - message_type: string - filter by message type
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const channelId = searchParams.get("channel_id");
    const status = searchParams.get("status");
    const direction = searchParams.get("direction");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");
    const connectorName = searchParams.get("connector_name");
    const messageType = searchParams.get("message_type");

    // Build query
    let query = supabase
      .from("messages")
      .select(
        "id, channel_id, connector_name, message_id, status, message_type, data_type, direction, processing_time_ms, created_at, error_content",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (channelId) {
      query = query.eq("channel_id", channelId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (direction) {
      query = query.eq("direction", direction);
    }
    if (connectorName) {
      query = query.eq("connector_name", connectorName);
    }
    if (messageType) {
      query = query.eq("message_type", messageType);
    }
    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }
    if (toDate) {
      query = query.lte("created_at", toDate);
    }

    const { data: messages, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch messages: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: messages || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Messages list error:", errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
