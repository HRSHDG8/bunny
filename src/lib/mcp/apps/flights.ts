import type { McpServer } from "@modelcontextprotocol/server";
import { registerHtmlApp } from "@/lib/mcp/apps/resource";

/** The UI resource Claude renders when the flights tool runs. */
export const FLIGHTS_APP_URI = "ui://bunny/flights.html";

/** Registers the boarding-pass flight view as an MCP App resource. */
export function registerFlightsApp(server: McpServer) {
  registerHtmlApp(server, {
    name: "Flight details",
    uri: FLIGHTS_APP_URI,
    file: "flights.html",
    description:
      "Boarding-pass style cards for a trip's flights, with times, seats and booking references.",
  });
}
