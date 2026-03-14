import { z } from "zod";

const triggerTypes = ["error_rate", "latency", "message_failure", "channel_down", "queue_depth", "custom"] as const;
const notificationChannels = ["email", "webhook", "slack", "sms"] as const;
const thresholdOperators = ["gt", "lt", "gte", "lte", "eq"] as const;

export const alertSchema = z.object({
  alertId: z.string().trim().min(5, "Alert ID is required.").max(24, "Keep the alert ID under 24 characters."),
  name: z.string().trim().min(3, "Name must be at least 3 characters.").max(80, "Keep the name under 80 characters."),
  description: z.string().trim().max(240, "Keep the description under 240 characters."),
  triggerType: z.enum(triggerTypes),
  thresholdValue: z.union([
    z.number().min(0, "Threshold must be zero or greater.").max(1000000, "Threshold is too large for this surface."),
    z.nan(),
  ]),
  thresholdOperator: z.enum(thresholdOperators),
  notificationChannel: z.enum(notificationChannels),
  notificationTarget: z.string().trim().min(3, "Notification target is required.").max(180, "Keep the notification target under 180 characters."),
  cooldownMinutes: z.number().int().min(1, "Cooldown must be at least 1 minute.").max(1440, "Cooldown must stay within 24 hours."),
  isActive: z.boolean(),
}).superRefine((value, context) => {
  if (Number.isNaN(value.thresholdValue)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Threshold value is required.", path: ["thresholdValue"] });
  }

  if (value.notificationChannel === "email" && !z.string().email().safeParse(value.notificationTarget).success) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Use a valid email address for email alerts.", path: ["notificationTarget"] });
  }

  if ((value.notificationChannel === "webhook" || value.notificationChannel === "slack") && !z.string().url().safeParse(value.notificationTarget).success) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Use a valid URL for webhook or Slack notifications.", path: ["notificationTarget"] });
  }

  if (value.notificationChannel === "sms" && !/^\+?[0-9()\-\s]{7,20}$/.test(value.notificationTarget)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Use a valid phone number for SMS alerts.", path: ["notificationTarget"] });
  }
});

export type AlertInput = z.infer<typeof alertSchema>;
export const alertTriggerTypes = triggerTypes;
export const alertNotificationChannels = notificationChannels;
export const alertThresholdOperators = thresholdOperators;