import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const channelFilter = searchParams.get("channel_id");
    const status = searchParams.get("status");
    const direction = searchParams.get("direction");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");
    const connectorName = searchParams.get("connector_name");
    const messageType = searchParams.get("message_type");

    let resolvedChannelId: string | null = null;
    if (channelFilter) {
      if (isUuid(channelFilter)) {
        resolvedChannelId = channelFilter;
      } else {
        const { data: channel } = await supabase
          .from("channels")
          .select("id")
          .eq("channel_id", channelFilter)
          .maybeSingle();

        if (!channel) {
          return NextResponse.json({
            messages: [],
            pagination: {
              total: 0,
              limit,
              offset,
              hasMore: false,
            },
          });
        }

        resolvedChannelId = channel.id;
      }
    }

    let query = supabase
      .from("messages")
      .select(
        "id, channel_id, connector_name, message_id, status, message_type, message_format, data_type, direction, processing_time_ms, created_at, error_content, source_system, destination_system",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (resolvedChannelId) {
      query = query.eq("channel_id", resolvedChannelId);
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
        { status: 500 },
      );
    }

    const uniqueChannelIds = [...new Set((messages || []).map((message) => message.channel_id).filter(Boolean))];
    const channelMap = new Map<string, { channel_id: string; name: string }>();

    if (uniqueChannelIds.length > 0) {
      const { data: channels } = await supabase
        .from("channels")
        .select("id, channel_id, name")
        .in("id", uniqueChannelIds);

      (channels || []).forEach((channel) => {
        channelMap.set(channel.id, { channel_id: channel.channel_id, name: channel.name });
      });
    }

    return NextResponse.json({
      messages: (messages || []).map((message) => ({
        ...message,
        channel: message.channel_id ? channelMap.get(message.channel_id) ?? null : null,
      })),
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
      { status: 500 },
    );
  }
}
