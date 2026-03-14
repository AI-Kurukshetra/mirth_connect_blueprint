import { MonitoringCharts } from "@/components/monitoring/monitoring-charts";
import { Card } from "@/components/ui/card";
import { getMetrics } from "@/lib/data/medflow";

export default async function MonitoringPage() {
  const metrics = await getMetrics();

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h1 className="display-face text-5xl text-ink">Monitoring</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Observe throughput, latency, and resource pressure across the last few ingestion windows.</p>
      </Card>
      <MonitoringCharts metrics={metrics} />
    </div>
  );
}

