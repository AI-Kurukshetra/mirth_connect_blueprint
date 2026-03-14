import { z } from "zod";

export const connectorTypes = ["MLLP", "HTTP", "SFTP", "TCP", "Database", "REST", "SOAP", "File"] as const;
export const connectorDirections = ["source", "destination", "bidirectional"] as const;
export const connectorAuthMethods = ["none", "basic", "token", "certificate"] as const;
export const connectorStatuses = ["connected", "disconnected", "error", "testing"] as const;

const hostRequiredTypes = new Set<(typeof connectorTypes)[number]>(["MLLP", "HTTP", "SFTP", "TCP", "Database", "REST", "SOAP"]);
const portRequiredTypes = new Set<(typeof connectorTypes)[number]>(["MLLP", "HTTP", "SFTP", "TCP", "Database", "REST", "SOAP"]);

export const connectorSchema = z.object({
  connectorId: z.string().trim().min(5, "Connector ID is required.").max(24, "Keep the connector ID under 24 characters."),
  name: z.string().trim().min(3, "Name must be at least 3 characters.").max(80, "Keep the name under 80 characters."),
  type: z.enum(connectorTypes),
  direction: z.enum(connectorDirections),
  host: z.string().trim().max(160, "Keep the host under 160 characters."),
  port: z.union([
    z.number().int().min(1, "Port must be between 1 and 65535.").max(65535, "Port must be between 1 and 65535."),
    z.nan(),
  ]),
  pathOrQueue: z.string().trim().max(180, "Keep the path or queue name under 180 characters."),
  authMethod: z.enum(connectorAuthMethods),
  status: z.enum(connectorStatuses),
}).superRefine((value, context) => {
  if (hostRequiredTypes.has(value.type) && value.host.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Host is required for this connector type.",
      path: ["host"],
    });
  }

  if (portRequiredTypes.has(value.type) && Number.isNaN(value.port)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Port is required for this connector type.",
      path: ["port"],
    });
  }

  if (value.type === "File" && value.pathOrQueue.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide a file path or queue name for file connectors.",
      path: ["pathOrQueue"],
    });
  }
});

export type ConnectorInput = z.infer<typeof connectorSchema>;