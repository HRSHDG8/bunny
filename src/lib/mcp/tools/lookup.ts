import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { airportList } from "@/lib/airports";
import { searchPlaces } from "@/lib/places";
import { registerTool } from "@/lib/mcp/tools/shared";

export function registerLookupTools(server: McpServer) {
  registerTool(
    server,
    "search_airports",
    {
      title: "Search airports",
      description:
        "Find airports by IATA code or city name. Returns the code, city and time zone, which is what the flight tools need.",
      inputSchema: z.object({
        query: z
          .string()
          .describe('An airport code ("LIS") or a city name ("Lisbon").'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(25)
          .describe("How many results to return. Defaults to 10.")
          .optional(),
      }),
    },
    async ({ query, limit }) => {
      const q = query.trim().toUpperCase();
      const matches = airportList
        .map((airport) => {
          const code = airport.code.toUpperCase();
          const city = (airport.city ?? "").toUpperCase();
          // Best match first: an exact code, then an exact city, then a city
          // that starts with the query, then anything else that contains it.
          let rank = 4;
          if (code === q) rank = 0;
          else if (city === q) rank = 1;
          else if (city.startsWith(q)) rank = 2;
          else if (code.includes(q) || city.includes(q)) rank = 3;
          return { airport, rank };
        })
        .filter(({ rank }) => rank < 4)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, limit ?? 10)
        .map(({ airport }) => ({
          code: airport.code,
          city: airport.city,
          timezone: airport.tz,
        }));
      return { query, airports: matches };
    },
  );

  registerTool(
    server,
    "search_places",
    {
      title: "Search places",
      description:
        "Look up a place by name to get its address and coordinates, for putting on the itinerary or a flight.",
      inputSchema: z.object({
        query: z.string().describe("What to look for, e.g. 'Alfama Lisbon'."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .describe("How many results to return. Defaults to 8.")
          .optional(),
      }),
    },
    async ({ query, limit }) => {
      const results = await searchPlaces(query, { limit: limit ?? 8 });
      return { query, results };
    },
  );
}
