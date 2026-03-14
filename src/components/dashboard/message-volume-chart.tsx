"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { Card } from "@/components/ui/card";
import type { MetricRow } from "@/types/database";

export function MessageVolumeChart({ metrics }: { metrics: MetricRow[] }) {
  const data = metrics.map((metric) => ({
    hour: new Date(metric.recorded_at).toLocaleTimeString("en-US", { hour: "numeric" }),
    volume: metric.messages_total,
    success: metric.messages_success,
  }));

  return (
    <Card className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Message volume</p>
          <h2 className="display-face mt-2 text-3xl text-ink">Throughput over the last six hours</h2>
        </div>
      </div>
      <div className="mt-8 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="volume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f6d69" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#0f6d69" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(17,32,42,0.08)" vertical={false} />
            <XAxis dataKey="hour" stroke="#5f6d76" />
            <Tooltip />
            <Area dataKey="volume" stroke="#0f6d69" fill="url(#volume)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

