import { readFile } from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

/** The UI resource Claude renders when the flights tool runs. */
export const FLIGHTS_APP_URI = "ui://bunny/flights.html";

let cachedHtml: string | null = null;

/**
 * The Vite build writes a single self-contained HTML file into `public/`.
 * Read it from disk, falling back to the deployed copy when the source tree
 * isn't available (for example inside a serverless function).
 */
async function readFlightsAppHtml() {
  if (cachedHtml) return cachedHtml;

  const file = path.join(process.cwd(), "public", "mcp-apps", "flights.html");
  try {
    cachedHtml = await readFile(file, "utf8");
    return cachedHtml;
  } catch (error) {
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!base) throw error;

    const response = await fetch(
      `${base.replace(/\/$/, "")}/mcp-apps/flights.html`,
      { cache: "no-store" },
    );
    if (!response.ok)
      throw new Error(
        `Couldn't load the flight details app (${response.status}).`,
      );
    cachedHtml = await response.text();
    return cachedHtml;
  }
}

/** Registers the boarding-pass flight view as an MCP App resource. */
export function registerFlightsApp(server: McpServer) {
  registerAppResource(
    server,
    "Flight details",
    FLIGHTS_APP_URI,
    {
      description:
        "Boarding-pass style cards for a trip's flights, with times, seats and booking references.",
    },
    async () => ({
      contents: [
        {
          uri: FLIGHTS_APP_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readFlightsAppHtml(),
        },
      ],
    }),
  );
}
