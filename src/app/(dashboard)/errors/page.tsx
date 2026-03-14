import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getErrorLogs } from "@/lib/data/medflow";

export default async function ErrorsPage() {
  const errors = await getErrorLogs();

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h1 className="display-face text-5xl text-ink">Errors</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Operational incidents, connector faults, and routing failures stay visible here for triage.</p>
      </Card>
      <div className="space-y-4">
        {errors.map((error) => (
          <Card key={error.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-ink">{error.error_code}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{error.error_message}</p>
              </div>
              <Badge tone={error.resolved ? "good" : "warm"}>{error.resolved ? "resolved" : "open"}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

