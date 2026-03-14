"use client";

import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import type { MetricRow } from "@/types/database";

export function MonitoringCharts({ metrics }: { metrics: MetricRow[] }) {
  const chartData = metrics.map((metric) => ({
    label: new Date(metric.recorded_at).toLocaleTimeString("en-US", { hour: "numeric" }),
    throughput: metric.throughput_per_min,
    latency: metric.avg_latency_ms,
    cpu: metric.cpu_usage_pct,
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">Throughput</h2>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid stroke="rgba(17,32,42,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#5f6d76" />
              <YAxis stroke="#5f6d76" />
              <Tooltip />
              <Area dataKey="throughput" stroke="#0f6d69" fill="#d8efe9" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">Latency and CPU</h2>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(17,32,42,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#5f6d76" />
              <YAxis stroke="#5f6d76" />
              <Tooltip />
              <Line dataKey="latency" stroke="#ff7f4d" strokeWidth={3} dot={false} />
              <Line dataKey="cpu" stroke="#0f6d69" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

