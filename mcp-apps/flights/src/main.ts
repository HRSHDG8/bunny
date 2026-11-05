import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/client";
import "./styles.css";

interface FlightPassenger {
  user_id: string;
  seat: string | null;
}

interface Flight {
  id: string;
  airline: string | null;
  flight_number: string | null;
  departure_place: string | null;
  departure_code: string | null;
  departure_time: string | null;
  departure_tz: string | null;
  departure_at: string | null;
  arrival_place: string | null;
  arrival_code: string | null;
  arrival_time: string | null;
  arrival_tz: string | null;
  arrival_at: string | null;
  booking_ref: string | null;
  notes: string | null;
  flight_passengers: FlightPassenger[];
}

interface Person {
  user_id: string;
  full_name: string;
}

interface FlightsPayload {
  trip_id: string;
  flights: Flight[];
  people: Person[];
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

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

function esc(value: unknown): string {
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

function parseWall(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function fmtTime(value: string | null): string {
  const date = parseWall(value);
  if (!date) return value || "TBD";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()} · ${hh}:${mm}`;
}

function tzSuffix(tz: string | null, at: string | null): string {
  if (!tz) return "";
  try {
    const date = at ? new Date(at) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(date);
    const label = parts.find((part) => part.type === "timeZoneName")?.value;
    return label ? ` ${label}` : "";
  } catch {
    return "";
  }
}

function fmtDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function legDuration(flight: Flight): string | null {
  if (!flight.departure_at || !flight.arrival_at) return null;
  const ms =
    new Date(flight.arrival_at).getTime() -
    new Date(flight.departure_at).getTime();
  return ms > 0 ? fmtDuration(ms) : null;
}

function nameOf(people: Person[], userId: string): string {
  return people.find((person) => person.user_id === userId)?.full_name ?? "Guest";
}

function flightCard(flight: Flight, people: Person[]): string {
  const departure =
    flight.departure_code || flight.departure_place?.slice(0, 6) || "-";
  const arrival =
    flight.arrival_code || flight.arrival_place?.slice(0, 6) || "-";
  const duration = legDuration(flight);
  const passengers = flight.flight_passengers ?? [];
  const seats = passengers.length
    ? passengers.map((passenger) => passenger.seat || "-").join(" · ")
    : "-";

  const badges = passengers.length
    ? passengers
        .map(
          (passenger) =>
            `<span class="badge badge-sea">${esc(
              nameOf(people, passenger.user_id),
            )}${passenger.seat ? ` · ${esc(passenger.seat)}` : ""}</span>`,
        )
        .join("")
    : `<span class="badge badge-amber">Whole trip</span>`;

  return `
    <article class="ticket">
      <div class="ticket-main">
        <div class="ticket-head">
          <div>
            <p class="micro">${esc(flight.airline || "Flight")}</p>
            <p class="flight-number">${esc(flight.flight_number || "-")}</p>
            <div class="badges">${badges}</div>
          </div>
        </div>
        <div class="route">
          <div class="endpoint">
            <p class="code">${esc(departure)}</p>
            <p class="place">${esc(flight.departure_place || "")}</p>
            <p class="time time-sea">${esc(fmtTime(flight.departure_time))}${esc(
              tzSuffix(flight.departure_tz, flight.departure_at),
            )}</p>
          </div>
          <div class="leg">
            <span class="line"></span>
            <span class="leg-mid">
              ${duration ? `<span class="duration">${esc(duration)}</span>` : ""}
              <span class="plane" aria-hidden="true">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
              </span>
            </span>
            <span class="line"></span>
          </div>
          <div class="endpoint endpoint-end">
            <p class="code">${esc(arrival)}</p>
            <p class="place">${esc(flight.arrival_place || "")}</p>
            <p class="time time-rust">${esc(fmtTime(flight.arrival_time))}${esc(
              tzSuffix(flight.arrival_tz, flight.arrival_at),
            )}</p>
          </div>
        </div>
      </div>
      <div class="stub">
        <p class="micro">Booking</p>
        <p class="mono">${esc(flight.booking_ref || "-")}</p>
        <p class="micro">Seats</p>
        <p class="mono">${esc(seats)}</p>
        ${
          flight.notes
            ? `<p class="micro">Notes</p><p class="note">${esc(flight.notes)}</p>`
            : ""
        }
      </div>
    </article>
  `;
}

function render(data: FlightsPayload | null, message?: string) {
  if (!root) return;
  if (message) {
    root.innerHTML = `<div class="notice">${esc(message)}</div>`;
    return;
  }
  if (!data) {
    root.innerHTML = `<p class="status">Loading flights…</p>`;
    return;
  }
  const flights = data.flights ?? [];
  if (flights.length === 0) {
    root.innerHTML = `<div class="empty"><strong>No flights yet</strong>This trip doesn't have any flights saved in bunny.</div>`;
    return;
  }
  const people = data.people ?? [];
  root.innerHTML = `<div class="stack">${flights
    .map((flight) => flightCard(flight, people))
    .join("")}</div>`;
}

function textOf(result: CallToolResult): string {
  const block = result.content?.find((item) => item.type === "text");
  return block && "text" in block ? block.text : "";
}

function payloadFrom(result: CallToolResult): FlightsPayload | null {
  const structured = result.structuredContent as FlightsPayload | undefined;
  if (structured && Array.isArray(structured.flights)) return structured;
  try {
    const parsed = JSON.parse(textOf(result)) as FlightsPayload;
    if (parsed && Array.isArray(parsed.flights)) return parsed;
  } catch {
    // The text fallback may not be JSON; the error message below covers it.
  }
  return null;
}

function applyHostContext(ctx: McpUiHostContext) {
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

const app = new App({ name: "bunny flights", version: "1.0.0" }, {});

app.ontoolinput = () => {
  render(null);
};

app.ontoolresult = (result) => {
  if (result.isError) {
    render(null, textOf(result) || "bunny couldn't load the flights.");
    return;
  }
  const payload = payloadFrom(result);
  if (payload) {
    render(payload);
  } else {
    render(null, "bunny couldn't read the flight details.");
  }
};

app.onhostcontextchanged = (ctx) => {
  applyHostContext(ctx);
};

app.onerror = (error) => {
  render(null, error.message);
};

app
  .connect(new PostMessageTransport(window.parent, window.parent))
  .then(() => {
    const ctx = app.getHostContext();
    if (ctx) applyHostContext(ctx);
  })
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown connection error.";
    render(null, `Couldn't connect to the host: ${message}`);
  });
