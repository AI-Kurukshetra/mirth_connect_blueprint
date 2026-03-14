import { z } from "zod";

const conditionTypes = ["message_type", "field_value", "source", "format", "custom"] as const;
const operators = ["equals", "contains", "starts_with", "regex", "exists"] as const;
const actions = ["route_to", "filter", "transform", "duplicate", "archive"] as const;

export const routingRuleSchema = z.object({
  ruleId: z.string().trim().min(5, "Rule ID is required.").max(24, "Keep the rule ID under 24 characters."),
  name: z.string().trim().min(3, "Name must be at least 3 characters.").max(80, "Keep the name under 80 characters."),
  description: z.string().trim().max(240, "Keep the description under 240 characters."),
  channelId: z.string().trim().min(1, "Select a source channel."),
  priority: z.number().int().min(1, "Priority must be at least 1.").max(99, "Priority must be under 100."),
  conditionType: z.enum(conditionTypes),
  conditionField: z.string().trim().max(120, "Keep the condition field under 120 characters."),
  conditionOperator: z.enum(operators),
  conditionValue: z.string().trim().max(240, "Keep the condition value under 240 characters."),
  action: z.enum(actions),
  destinationChannelId: z.string().trim(),
  isActive: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.conditionOperator !== "exists" && value.conditionValue.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Condition value is required unless the operator is exists.",
      path: ["conditionValue"],
    });
  }

  if (value.action === "route_to" || value.action === "duplicate") {
    if (value.destinationChannelId.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a destination channel for this action.",
        path: ["destinationChannelId"],
      });
    }
  }

  if (value.destinationChannelId.length > 0 && value.destinationChannelId === value.channelId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Destination channel must differ from the source channel.",
      path: ["destinationChannelId"],
    });
  }
});

export type RoutingRuleInput = z.infer<typeof routingRuleSchema>;
export const routingConditionTypes = conditionTypes;
export const routingOperators = operators;
export const routingActions = actions;
