import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );
}

export function textOf(result: CallToolResult): string {
  const block = result.content?.find((item) => item.type === "text");
  return block && "text" in block ? block.text : "";
}

/**
 * Reads a structured tool result, falling back to the JSON text block that
 * bunny always sends alongside it.
 */
export function payloadFrom<T>(
  result: CallToolResult,
  isPayload: (value: unknown) => value is T,
): T | null {
  const structured = result.structuredContent;
  if (isPayload(structured)) return structured;
  try {
    const parsed: unknown = JSON.parse(textOf(result));
    if (isPayload(parsed)) return parsed;
  } catch {
    // The text fallback may not be JSON; the caller shows a friendly error.
  }
  return null;
}

export function parseWall(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function fmtDateTime(
  value: string | null | undefined,
  fallback = "TBD",
): string {
  const date = parseWall(value);
  if (!date) return value || fallback;
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()} · ${clock(date)}`;
}

export function fmtShortDateTime(
  value: string | null | undefined,
  fallback = "TBD",
): string {
  const date = parseWall(value);
  if (!date) return value || fallback;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${clock(date)}`;
}

export function fmtClock(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const date = parseWall(value);
  return date ? clock(date) : value;
}

export function dayDate(
  startDate: string | null | undefined,
  dayNumber: number,
): Date | null {
  if (!startDate) return null;
  const date = parseWall(`${startDate}T00:00:00`);
  if (!date) return null;
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

export function fmtDayLabel(date: Date | null): string {
  if (!date) return "";
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function applyHostContext(ctx: McpUiHostContext) {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    document.body.style.padding = `${top + 12}px ${right + 12}px ${
      bottom + 12
    }px ${left + 12}px`;
  }
}

export interface BunnyAppHandlers {
  name: string;
  version?: string;
  onToolInput?: () => void;
  onToolResult: (result: CallToolResult) => void;
  onError: (message: string) => void;
}

/** Creates the MCP App, wires the host events and connects to the parent. */
export function connectBunnyApp(handlers: BunnyAppHandlers): App {
  const app = new App(
    { name: handlers.name, version: handlers.version ?? "1.0.0" },
    {},
  );

  app.ontoolinput = () => handlers.onToolInput?.();
  app.ontoolresult = (result) => handlers.onToolResult(result);
  app.onhostcontextchanged = (ctx) => applyHostContext(ctx);
  app.onerror = (error) => handlers.onError(error.message);

  app
    .connect(new PostMessageTransport(window.parent, window.parent))
    .then(() => {
      const ctx = app.getHostContext();
      if (ctx) applyHostContext(ctx);
    })
    .catch((error: unknown) => {
      handlers.onError(
        error instanceof Error ? error.message : "Unknown connection error.",
      );
    });

  return app;
}

/** Small inline icon helpers so the widgets stay self-contained. */
export const ICONS = {
  bed: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7v13"/><path d="M3 17h18"/><path d="M21 17v-4a3 3 0 0 0-3-3H9v7"/><path d="M6.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/></svg>`,
  car: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13l2-5a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 8l2 5"/><path d="M4 13h16v5H4z"/><path d="M7 18v2"/><path d="M17 18v2"/><path d="M7 13h10"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z"/><circle cx="12" cy="11" r="2.2"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  note: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v11l-4 5H5z"/><path d="M15 20v-5h4"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>`,
  key: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="4"/><path d="M11 11l9 9"/><path d="M16 16l2-2"/><path d="M19 19l2-2"/></svg>`,
};
