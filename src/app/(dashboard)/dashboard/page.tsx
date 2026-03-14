import { MessageVolumeChart } from "@/components/dashboard/message-volume-chart";
import { RecentMessages } from "@/components/dashboard/recent-messages";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/data/medflow";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="good">Live operations snapshot</Badge>
        <h1 className="display-face mt-4 text-5xl text-ink sm:text-6xl">MedFlow command center</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">
          This dashboard is wired to Supabase for seeded healthcare integration data, with route protection,
          page loaders, button loaders, and production-style monitoring surfaces.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.stats.map((stat) => <StatsCard key={stat.label} {...stat} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MessageVolumeChart metrics={snapshot.metrics} />
        <RecentMessages messages={snapshot.messages} />
      </div>
    </div>
  );
}

