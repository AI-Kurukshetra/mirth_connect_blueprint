import { z } from "zod";

export const simulatorSchema = z.object({
  channelId: z.string().min(1, "Select a channel."),
  payload: z.string().min(12, "Test payload must be at least 12 characters."),
});

export type SimulatorInput = z.infer<typeof simulatorSchema>;
