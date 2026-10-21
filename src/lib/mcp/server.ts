import type { McpServer } from "@modelcontextprotocol/server";
import { registerTripTools } from "@/lib/mcp/tools/trips";
import { registerFlightTools } from "@/lib/mcp/tools/flights";
import { registerRentalTools } from "@/lib/mcp/tools/rentals";
import { registerItineraryTools } from "@/lib/mcp/tools/itinerary";
import { registerLookupTools } from "@/lib/mcp/tools/lookup";
import { registerPlanTools } from "@/lib/mcp/tools/plan";

export const MCP_SERVER_NAME = "bunny";
export const MCP_SERVER_VERSION = "1.0.0";

export const MCP_INSTRUCTIONS =
  "bunny is a shared trip planner. Every tool acts as the signed-in bunny user, so it can only see and change their own trips. Use list_trips to find a trip id, get_trip to read one, and plan_trip to set up a whole trip in one go.";

/** Registers every bunny tool on an MCP server instance. */
export function registerMcpTools(server: McpServer) {
  registerTripTools(server);
  registerFlightTools(server);
  registerRentalTools(server);
  registerItineraryTools(server);
  registerLookupTools(server);
  registerPlanTools(server);
  return server;
}
