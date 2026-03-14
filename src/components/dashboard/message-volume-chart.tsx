"use client";

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { compactNumber } from "@/lib/utils";
import type { MetricRow } from "@/types/database";

export function MessageVolumeChart({ metrics }: { metrics: MetricRow[] }) {
  const latest = metrics.at(-1);
  const data = metrics.map((metric) => ({
    hour: new Date(metric.recorded_at).toLocaleTimeString("en-US", { hour: "numeric" }),
    failed: metric.messages_failed,
    success: metric.messages_success,
    volume: metric.messages_total,
  }));

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-line/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(236,245,240,0.78))] px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Message volume</p>
            <h2 className="display-face mt-2 text-3xl text-ink">Throughput over the current telemetry window</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="rounded-full border border-line-strong bg-white/80 px-4 py-2">{compactNumber(latest?.messages_total ?? 0)} total</span>
            <span className="rounded-full border border-line-strong bg-white/80 px-4 py-2">{latest?.throughput_per_min ?? 0} msg/min</span>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="volume" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0f6d69" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0f6d69" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="success" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#79d3c4" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#79d3c4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(17,32,42,0.08)" vertical={false} />
              <XAxis dataKey="hour" stroke="#5f6d76" />
              <YAxis stroke="#5f6d76" />
              <Tooltip />
              <Area dataKey="volume" fill="url(#volume)" stroke="#0f6d69" strokeWidth={3} type="monotone" />
              <Area dataKey="success" fill="url(#success)" stroke="#79d3c4" strokeWidth={2} type="monotone" />
              <Line dataKey="failed" dot={false} stroke="#cf6a41" strokeWidth={2} type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}