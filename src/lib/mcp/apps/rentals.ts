import type { McpServer } from "@modelcontextprotocol/server";
import { registerHtmlApp } from "@/lib/mcp/apps/resource";

/** The UI resource Claude renders when the rentals tool runs. */
export const RENTALS_APP_URI = "ui://bunny/rentals.html";

/** Registers the car-key rental view as an MCP App resource. */
export function registerRentalsApp(server: McpServer) {
  registerHtmlApp(server, {
    name: "Car rental",
    uri: RENTALS_APP_URI,
    file: "rentals.html",
    description:
      "Key-fob style cards for a trip's car rentals, with drivers, pickup and drop-off times, places and the number plate.",
  });
}
