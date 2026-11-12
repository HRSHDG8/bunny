import type { McpServer } from "@modelcontextprotocol/server";
import { registerHtmlApp } from "@/lib/mcp/apps/resource";

/** The UI resource Claude renders when the itinerary tool runs. */
export const ITINERARY_APP_URI = "ui://bunny/itinerary.html";

/** Registers the day-by-day itinerary view as an MCP App resource. */
export function registerItineraryApp(server: McpServer) {
  registerHtmlApp(server, {
    name: "Itinerary",
    uri: ITINERARY_APP_URI,
    file: "itinerary.html",
    description:
      "A day-by-day timeline of a trip's activities, with times, places, linked stays and notes.",
  });
}
