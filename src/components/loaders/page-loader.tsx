import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader({ title = "Loading MedFlow" }: { title?: string }) {
  return (
    <div className="app-grid min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{title}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </Card>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-[360px]" />
          <Skeleton className="h-[360px]" />
        </div>
      </div>
    </div>
  );
}

