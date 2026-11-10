import { z } from "zod";
import type {
  McpServer,
  ServerContext,
  StandardSchemaWithJSON,
  ToolCallback,
} from "@modelcontextprotocol/server";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { principalFromAuthInfo, type McpPrincipal } from "@/lib/mcp/session";

export const READ_SCOPE = "trips:read";
export const WRITE_SCOPE = "trips:write";

/** Dates and times are plain strings so a model can pass them straight through. */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");
export const dateTimeString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/, "Use a YYYY-MM-DDTHH:MM date and time.");
export const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}/, "Use a HH:MM time.");
export const uuid = z.string().uuid();

export function requirePrincipal(ctx: ServerContext, scope: string): McpPrincipal {
  const authInfo = ctx.http?.authInfo;
  if (!authInfo) throw new Error("This request isn't signed in to bunny.");

  const principal = principalFromAuthInfo(authInfo);
  if (scope === WRITE_SCOPE && !principal.scopes.includes(WRITE_SCOPE))
    throw new Error(
      "This connection is read-only. Reconnect with write access to make changes.",
    );
  return principal;
}

/**
 * Merge helper for update tools: a field the caller left out keeps the value
 * it already has, so "change the arrival time" doesn't wipe the airline.
 */
export function merged<T>(
  value: T | undefined,
  current: T | null | undefined,
  fallback: T,
): T {
  if (value !== undefined) return value;
  return current ?? fallback;
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Something went wrong.";
}

interface ToolConfig<Schema extends z.ZodType> {
  title: string;
  description: string;
  inputSchema: Schema;
  /** Write tools need the trips:write scope. */
  write?: boolean;
  /** When set, the host renders this MCP App resource alongside the result. */
  ui?: {
    resourceUri: string;
    /** App-only tools are callable by the UI but hidden from the model. */
    visibility?: ("model" | "app")[];
  };
}

/** Structured tool output must be an object, not an array or a primitive. */
function structuredContentOf(
  data: unknown,
): Record<string, unknown> | undefined {
  if (data && typeof data === "object" && !Array.isArray(data))
    return data as Record<string, unknown>;
  return undefined;
}

/**
 * Registers a tool and turns thrown errors into `isError` results, so the
 * model sees a readable message instead of a protocol error.
 */
export function registerTool<Schema extends z.ZodType>(
  server: McpServer,
  name: string,
  config: ToolConfig<Schema>,
  handler: (args: z.infer<Schema>, principal: McpPrincipal) => Promise<unknown>,
) {
  const callback: ToolCallback<StandardSchemaWithJSON> = async (args, ctx) => {
    try {
      const principal = requirePrincipal(
        ctx,
        config.write ? WRITE_SCOPE : READ_SCOPE,
      );
      const data = await handler(args as z.infer<Schema>, principal);
      const structuredContent = config.ui
        ? structuredContentOf(data)
        : undefined;
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        ...(structuredContent ? { structuredContent } : {}),
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: errorMessage(error) }],
        isError: true,
      };
    }
  };

  // The SDK accepts any Standard Schema with a JSON Schema converter;
  // zod v4 provides one, but its converter type is wider than the SDK's,
  // so the cast is what keeps the two in step.
  const inputSchema = config.inputSchema as unknown as StandardSchemaWithJSON;

  if (config.ui) {
    registerAppTool(
      server,
      name,
      {
        title: config.title,
        description: config.description,
        inputSchema,
        _meta: { ui: config.ui },
      },
      callback,
    );
    return;
  }

  server.registerTool(
    name,
    {
      title: config.title,
      description: config.description,
      inputSchema,
    },
    callback,
  );
}
