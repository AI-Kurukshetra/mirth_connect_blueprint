import { MonitoringCharts } from "@/components/monitoring/monitoring-charts";
import { getChannels, getConnectors, getErrorLogs, getMessages, getMetrics } from "@/lib/data/medflow";

export default async function MonitoringPage() {
  const [metrics, channels, connectors, messages, errors] = await Promise.all([
    getMetrics(),
    getChannels(),
    getConnectors(),
    getMessages(),
    getErrorLogs(),
  ]);

  return (
    <MonitoringCharts
      channels={channels}
      connectors={connectors}
      errors={errors}
      messages={messages}
      metrics={metrics}
    />
  );
}