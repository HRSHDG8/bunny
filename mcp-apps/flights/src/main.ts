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

interface TripInfo {
  id: string;
  title: string;
  completed: boolean;
}

interface FlightsPayload {
  trip_id: string;
  can_write?: boolean;
  trip?: TripInfo;
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
const SEAT_LETTERS = "ABCDEF";
const SEAT_PATTERN = /^[0-9]{1,2}[A-Z]$/;

let payload: FlightsPayload | null = null;
/** Unsaved seat drafts: flight id → user id → seat. */
const drafts = new Map<string, Map<string, string>>();
const saving = new Set<string>();
const errors = new Map<string, string>();
const savedAt = new Map<string, number>();

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

function validSeat(value: string): boolean {
  return value === "" || SEAT_PATTERN.test(value);
}

function originalSeat(flightId: string, userId: string): string {
  const flight = payload?.flights.find((item) => item.id === flightId);
  const passenger = flight?.flight_passengers.find(
    (item) => item.user_id === userId,
  );
  return passenger?.seat ?? "";
}

function draftSeat(flightId: string, userId: string): string {
  const draft = drafts.get(flightId)?.get(userId);
  return draft !== undefined ? draft : originalSeat(flightId, userId);
}

function setDraft(flightId: string, userId: string, value: string) {
  let map = drafts.get(flightId);
  if (!map) {
    map = new Map();
    drafts.set(flightId, map);
  }
  map.set(userId, value);
}

function isEditable(): boolean {
  return Boolean(payload && payload.can_write !== false && !payload.trip?.completed);
}

function seatChip(flightId: string, passenger: FlightPassenger, people: Person[]) {
  const name = nameOf(people, passenger.user_id);
  if (!isEditable()) {
    return `<span class="badge badge-sea">${esc(name)}${
      passenger.seat ? ` · ${esc(passenger.seat)}` : ""
    }</span>`;
  }
  return `
    <label class="seat-chip" title="Seat for ${esc(name)}">
      <span class="seat-name">${esc(name)}</span>
      <input
        class="seat-input"
        data-flight="${esc(flightId)}"
        data-user="${esc(passenger.user_id)}"
        value="${esc(draftSeat(flightId, passenger.user_id))}"
        maxlength="3"
        autocomplete="off"
        spellcheck="false"
        aria-label="Seat for ${esc(name)}"
      />
    </label>
  `;
}

function flightCard(flight: Flight, people: Person[]): string {
  const departure =
    flight.departure_code || flight.departure_place?.slice(0, 6) || "-";
  const arrival =
    flight.arrival_code || flight.arrival_place?.slice(0, 6) || "-";
  const duration = legDuration(flight);
  const passengers = flight.flight_passengers ?? [];
  const editable = isEditable();

  const badges = passengers.length
    ? passengers
        .map((passenger) => seatChip(flight.id, passenger, people))
        .join("")
    : `<span class="badge badge-amber">Whole trip</span>`;

  const actions =
    editable && passengers.length > 0
      ? `
        <div class="seat-actions">
          <button type="button" class="btn btn-ghost" data-action="auto" data-flight="${esc(flight.id)}">Auto-assign</button>
          <button type="button" class="btn btn-primary" data-action="save" data-flight="${esc(flight.id)}" disabled>Save seats</button>
          <span class="save-state" data-state="${esc(flight.id)}"></span>
        </div>
      `
      : "";

  const error = errors.get(flight.id);

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
        ${actions}
        ${error ? `<p class="card-error">${esc(error)}</p>` : ""}
      </div>
      <div class="stub">
        <p class="micro">Booking</p>
        <p class="mono">${esc(flight.booking_ref || "-")}</p>
        <p class="micro">Seats</p>
        <p class="mono">${esc(
          passengers.length
            ? passengers.map((p) => p.seat || "-").join(" · ")
            : "-",
        )}</p>
        ${
          flight.notes
            ? `<p class="micro">Notes</p><p class="note">${esc(flight.notes)}</p>`
            : ""
        }
      </div>
    </article>
  `;
}

function render(message?: string) {
  if (!root) return;
  if (message) {
    root.innerHTML = `<div class="notice">${esc(message)}</div>`;
    return;
  }
  if (!payload) {
    root.innerHTML = `<p class="status">Loading flights…</p>`;
    return;
  }
  const flights = payload.flights ?? [];
  if (flights.length === 0) {
    root.innerHTML = `<div class="empty"><strong>No flights yet</strong>This trip doesn't have any flights saved in bunny.</div>`;
    return;
  }

  let banner = "";
  if (payload.can_write === false) {
    banner = `<div class="banner">This connection is read-only. Reconnect with write access to change seats.</div>`;
  } else if (payload.trip?.completed) {
    banner = `<div class="banner">This trip is finished and locked, so seats can't be changed.</div>`;
  }

  const people = payload.people ?? [];
  root.innerHTML = `${banner}<div class="stack">${flights
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

function updatedFlightFrom(result: CallToolResult): Flight | null {
  const structured = result.structuredContent as { flight?: Flight } | undefined;
  if (structured?.flight) return structured.flight;
  try {
    const parsed = JSON.parse(textOf(result)) as { flight?: Flight };
    return parsed.flight ?? null;
  } catch {
    return null;
  }
}

function flightInputs(flightId: string): HTMLInputElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLInputElement>(
      `.seat-input[data-flight="${CSS.escape(flightId)}"]`,
    ),
  );
}

function refreshFlightState(flightId: string) {
  if (!root) return;
  const inputs = flightInputs(flightId);
  let valid = true;
  for (const input of inputs) {
    const ok = validSeat(input.value);
    input.classList.toggle("invalid", !ok);
    input.setAttribute("aria-invalid", ok ? "false" : "true");
    if (!ok) valid = false;
  }

  const dirty = inputs.some(
    (input) =>
      (input.value || "") !== originalSeat(flightId, input.dataset.user ?? ""),
  );

  const save = root.querySelector<HTMLButtonElement>(
    `button[data-action="save"][data-flight="${CSS.escape(flightId)}"]`,
  );
  if (save) save.disabled = !valid || !dirty || saving.has(flightId);

  const state = root.querySelector<HTMLElement>(
    `[data-state="${CSS.escape(flightId)}"]`,
  );
  if (state) {
    if (saving.has(flightId)) state.textContent = "Saving…";
    else if (!valid) state.textContent = "Check the seat format (e.g. 12A).";
    else if (dirty) state.textContent = "Unsaved changes";
    else if (savedAt.has(flightId)) state.textContent = "Seats saved";
    else state.textContent = "";
  }
}

function autoAssign(flightId: string) {
  const inputs = flightInputs(flightId);
  const used = new Set(
    inputs
      .map((input) => input.value.trim().toUpperCase())
      .filter((seat) => seat !== ""),
  );
  const empty = inputs.filter((input) => input.value.trim() === "");

  let row = 1;
  let letter = 0;
  for (const input of empty) {
    let seat = "";
    while (!seat) {
      const candidate = `${row}${SEAT_LETTERS[letter]}`;
      letter += 1;
      if (letter >= SEAT_LETTERS.length) {
        letter = 0;
        row += 1;
      }
      if (!used.has(candidate)) {
        used.add(candidate);
        seat = candidate;
      }
    }
    input.value = seat;
    setDraft(flightId, input.dataset.user ?? "", seat);
  }
  refreshFlightState(flightId);
}

async function saveSeats(flightId: string) {
  if (!payload || saving.has(flightId)) return;
  const flight = payload.flights.find((item) => item.id === flightId);
  if (!flight) return;

  const inputs = flightInputs(flightId);
  if (inputs.some((input) => !validSeat(input.value))) {
    refreshFlightState(flightId);
    return;
  }

  const seats = new Map(
    inputs.map((input) => [
      input.dataset.user ?? "",
      input.value.trim().toUpperCase(),
    ]),
  );
  const passengers = (flight.flight_passengers ?? []).map((passenger) => ({
    user_id: passenger.user_id,
    seat: seats.get(passenger.user_id) ?? passenger.seat ?? "",
  }));

  saving.add(flightId);
  errors.delete(flightId);
  savedAt.delete(flightId);
  refreshFlightState(flightId);
  for (const input of inputs) input.disabled = true;

  try {
    const result = await app.callServerTool({
      name: "set_flight_seats",
      arguments: { flight_id: flightId, passengers },
    });
    if (result.isError)
      throw new Error(textOf(result) || "bunny couldn't save the seats.");

    const updated = updatedFlightFrom(result);
    if (!updated) throw new Error("bunny didn't return the updated flight.");

    const index = payload.flights.findIndex((item) => item.id === flightId);
    if (index >= 0) payload.flights[index] = updated;
    drafts.delete(flightId);
    savedAt.set(flightId, Date.now());
  } catch (error) {
    errors.set(
      flightId,
      error instanceof Error ? error.message : "Couldn't save the seats.",
    );
  } finally {
    saving.delete(flightId);
    render();
    if (savedAt.has(flightId)) {
      window.setTimeout(() => {
        savedAt.delete(flightId);
        if (payload) render();
      }, 4000);
    }
  }
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

root.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.classList.contains("seat-input")) return;

  const flightId = input.dataset.flight ?? "";
  const userId = input.dataset.user ?? "";
  const value = input.value.trim().toUpperCase().slice(0, 3);
  if (input.value !== value) input.value = value;

  setDraft(flightId, userId, value);
  refreshFlightState(flightId);
});

root.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.classList.contains("seat-input")) return;
  event.preventDefault();
  void saveSeats(input.dataset.flight ?? "");
});

root.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button[data-action]");
  if (!button) return;

  const flightId = button.dataset.flight ?? "";
  if (button.dataset.action === "auto") autoAssign(flightId);
  else if (button.dataset.action === "save") void saveSeats(flightId);
});

const app = new App({ name: "bunny flights", version: "1.0.0" }, {});

app.ontoolinput = () => {
  render();
};

app.ontoolresult = (result) => {
  if (result.isError) {
    render(textOf(result) || "bunny couldn't load the flights.");
    return;
  }
  const next = payloadFrom(result);
  if (!next) {
    render("bunny couldn't read the flight details.");
    return;
  }
  payload = next;
  drafts.clear();
  errors.clear();
  savedAt.clear();
  render();
};

app.onhostcontextchanged = (ctx) => {
  applyHostContext(ctx);
};

app.onerror = (error) => {
  render(error.message);
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
    render(`Couldn't connect to the host: ${message}`);
  });
