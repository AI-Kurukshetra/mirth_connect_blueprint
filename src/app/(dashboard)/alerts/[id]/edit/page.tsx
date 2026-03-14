import { notFound, redirect } from "next/navigation";

import { AlertForm } from "@/components/alerts/alert-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/authz";
import { getAlert, getAlertHistory } from "@/lib/data/medflow";
import type { AlertInput } from "@/lib/validations/alert";

export default async function EditAlertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await getAuthContext();
  const [alert, history] = await Promise.all([getAlert(id), getAlertHistory()]);

  if (!alert) {
    notFound();
  }

  if (!permissions.canEdit) {
    redirect("/alerts");
  }

  const initialValues: AlertInput = {
    alertId: alert.alert_id,
    name: alert.name,
    description: alert.description ?? "",
    triggerType: alert.trigger_type,
    thresholdValue: alert.threshold_value ?? Number.NaN,
    thresholdOperator: alert.threshold_operator ?? "gt",
    notificationChannel: alert.notification_channel,
    notificationTarget: alert.notification_target,
    cooldownMinutes: alert.cooldown_minutes,
    isActive: alert.is_active,
  };

  const historyPreview = history
    .filter((item) => item.alert_id === alert.id)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      triggeredAt: item.triggered_at,
      message: item.message,
      triggerValue: item.trigger_value,
      notified: item.notified,
    }));

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone={alert.is_active ? "good" : "neutral"}>{alert.is_active ? "active alert" : "inactive alert"}</Badge>
            <h1 className="display-face mt-4 text-5xl text-ink">Tune {alert.alert_id}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">Adjust thresholds, delivery targets, and cooldown posture for this escalation contract.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={alert.notification_channel === "sms" ? "warm" : alert.notification_channel === "slack" ? "gold" : alert.notification_channel === "email" ? "good" : "neutral"}>{alert.notification_channel}</Badge>
            <Badge tone="neutral">{alert.trigger_type.replaceAll("_", " ")}</Badge>
          </div>
        </div>
      </Card>
      <AlertForm currentAlertId={alert.alert_id} historyPreview={historyPreview} initialValues={initialValues} mode="edit" />
    </div>
  );
}