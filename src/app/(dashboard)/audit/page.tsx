import { Card } from "@/components/ui/card";
import { getAuditLogs } from "@/lib/data/medflow";
import { formatRelativeTime } from "@/lib/utils";

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h1 className="display-face text-5xl text-ink">Audit log</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Immutable operational actions are surfaced here for compliance and forensics.</p>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/76 text-muted">
              <tr>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Entity</th>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-line/80 bg-white/40">
                  <td className="px-6 py-4 font-semibold text-ink">{log.action}</td>
                  <td className="px-6 py-4 text-muted">{log.entity_type}</td>
                  <td className="px-6 py-4 text-muted">{log.entity_id}</td>
                  <td className="px-6 py-4 text-muted">{formatRelativeTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

