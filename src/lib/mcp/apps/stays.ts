import type { McpServer } from "@modelcontextprotocol/server";
import { registerHtmlApp } from "@/lib/mcp/apps/resource";

/** The UI resource Claude renders when the stays tool runs. */
export const STAYS_APP_URI = "ui://bunny/stays.html";

/** Registers the hotel key-card stay view as an MCP App resource. */
export function registerStaysApp(server: McpServer) {
  registerHtmlApp(server, {
    name: "Stay details",
    uri: STAYS_APP_URI,
    file: "stays.html",
    description:
      "Hotel key-card style cards for a trip's stays, with check-in and check-out times, addresses and booking references.",
  });
}
