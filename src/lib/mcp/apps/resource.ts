import { readFile } from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const cache = new Map<string, string>();

interface HtmlAppOptions {
  /** Human-readable name, also used in load errors. */
  name: string;
  /** Resource URI the tool points at, e.g. `ui://bunny/stays.html`. */
  uri: string;
  /** Description shown to hosts that list app resources. */
  description: string;
  /** File name under `public/mcp-apps`, written by the Vite build. */
  file: string;
}

/**
 * The Vite builds write self-contained HTML files into `public/`.
 * Read them from disk, falling back to the deployed copy when the source tree
 * isn't available (for example inside a serverless function).
 */
async function readAppHtml(file: string, name: string) {
  const cached = cache.get(file);
  if (cached) return cached;

  const disk = path.join(process.cwd(), "public", "mcp-apps", file);
  try {
    const html = await readFile(disk, "utf8");
    cache.set(file, html);
    return html;
  } catch (error) {
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!base) throw error;

    const response = await fetch(
      `${base.replace(/\/$/, "")}/mcp-apps/${file}`,
      { cache: "no-store" },
    );
    if (!response.ok)
      throw new Error(`Couldn't load the ${name} app (${response.status}).`);
    const html = await response.text();
    cache.set(file, html);
    return html;
  }
}

/** Registers a single-file bunny UI as an MCP App resource. */
export function registerHtmlApp(server: McpServer, options: HtmlAppOptions) {
  registerAppResource(
    server,
    options.name,
    options.uri,
    { description: options.description },
    async () => ({
      contents: [
        {
          uri: options.uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readAppHtml(options.file, options.name),
        },
      ],
    }),
  );
}
