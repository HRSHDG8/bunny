import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  createFlight,
  deleteFlight,
  updateFlight,
  type FlightInput,
} from "@/lib/services/flights";
import { apiError } from "@/lib/supabase/errors";
import { registerTool, dateTimeString, merged, uuid } from "@/lib/mcp/tools/shared";
import { loadFlight, loadFlights } from "@/lib/mcp/tools/queries";
import type { Flight } from "@/lib/types";

const passenger = z.object({
  user_id: uuid.describe("The bunny user id of the passenger."),
  seat: z.string().describe("Seat assignment, e.g. '12A'. Can be empty."),
});

const flightFields = {
  airline: z.string().describe("Airline name, e.g. 'TAP Air Portugal'.").optional(),
  flight_number: z.string().describe("Flight number, e.g. 'TP1367'.").optional(),
  departure_place: z
    .string()
    .describe("Departure airport or station name, e.g. 'Humberto Delgado Airport'.")
    .optional(),
  departure_code: z
    .string()
    .describe("Departure IATA airport code, e.g. 'LIS'.")
    .optional(),
  departure_time: dateTimeString
    .describe("Local departure time at the departure airport (YYYY-MM-DDTHH:MM).")
    .optional(),
  arrival_place: z
    .string()
    .describe("Arrival airport or station name, e.g. 'Paris Charles de Gaulle'.")
    .optional(),
  arrival_code: z
    .string()
    .describe("Arrival IATA airport code, e.g. 'CDG'.")
    .optional(),
  arrival_time: dateTimeString
    .describe("Local arrival time at the arrival airport (YYYY-MM-DDTHH:MM).")
    .optional(),
  journey_id: z
    .string()
    .describe(
      "The id of another flight on the same trip to connect this leg to. Leave empty for a standalone flight.",
    )
    .optional(),
  booking_ref: z.string().describe("Booking reference.").optional(),
  notes: z.string().describe("Anything worth remembering about the flight.").optional(),
  passengers: z
    .array(passenger)
    .describe("Who is on the flight, with their seat.")
    .optional(),
};

function toFlightInput(args: Record<string, unknown>): FlightInput {
  return {
    airline: (args.airline as string) ?? "",
    flight_number: (args.flight_number as string) ?? "",
    departure_place: (args.departure_place as string) ?? "",
    departure_code: (args.departure_code as string) ?? "",
    departure_time: (args.departure_time as string) ?? "",
    arrival_place: (args.arrival_place as string) ?? "",
    arrival_code: (args.arrival_code as string) ?? "",
    arrival_time: (args.arrival_time as string) ?? "",
    journey_id: (args.journey_id as string) || null,
    booking_ref: (args.booking_ref as string) ?? "",
    notes: (args.notes as string) ?? "",
    passengers: ((args.passengers as { user_id: string; seat: string }[]) ?? []).map(
      (p) => ({ user_id: p.user_id, seat: p.seat ?? "" }),
    ),
  };
}

/** Keep whatever the caller didn't mention, so a partial edit stays partial. */
function mergeFlightInput(current: Flight, args: Record<string, unknown>): FlightInput {
  const text = (key: string, fallback: string | null) =>
    merged(args[key] as string | undefined, fallback, "");
  const passengers =
    args.passengers === undefined
      ? (current.flight_passengers ?? []).map((p) => ({
          user_id: p.user_id,
          seat: p.seat ?? "",
        }))
      : ((args.passengers as { user_id: string; seat: string }[]) ?? []).map(
          (p) => ({ user_id: p.user_id, seat: p.seat ?? "" }),
        );

  return {
    airline: text("airline", current.airline),
    flight_number: text("flight_number", current.flight_number),
    departure_place: text("departure_place", current.departure_place),
    departure_code: text("departure_code", current.departure_code),
    departure_time: text("departure_time", current.departure_time),
    arrival_place: text("arrival_place", current.arrival_place),
    arrival_code: text("arrival_code", current.arrival_code),
    arrival_time: text("arrival_time", current.arrival_time),
    journey_id:
      args.journey_id === undefined
        ? current.journey_id
        : ((args.journey_id as string) || null),
    booking_ref: text("booking_ref", current.booking_ref),
    notes: text("notes", current.notes),
    passengers,
  };
}

async function flightTripId(
  supabase: Parameters<typeof loadFlights>[0],
  flightId: string,
) {
  const { data, error } = await supabase
    .from("flights")
    .select("trip_id")
    .eq("id", flightId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the flight.", error);
  if (!data) throw new Error("That flight doesn't exist, or you don't have access to it.");
  return data.trip_id as string;
}

export function registerFlightTools(server: McpServer) {
  registerTool(
    server,
    "list_flights",
    {
      title: "List flights",
      description: "List the flights on a trip, with their passengers.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
      }),
    },
    async ({ trip_id }, principal) => {
      const flights = await loadFlights(principal.supabase, trip_id);
      return { trip_id, flights };
    },
  );

  registerTool(
    server,
    "create_flight",
    {
      title: "Add a flight",
      description:
        "Add a flight to a trip. Times are local wall clocks at each airport; bunny resolves the time zones from the airport codes.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
        ...flightFields,
      }),
      write: true,
    },
    async ({ trip_id, ...rest }, principal) => {
      const flightId = await createFlight(
        principal.supabase,
        trip_id,
        toFlightInput(rest),
      );
      const flights = await loadFlights(principal.supabase, trip_id);
      return { flight: flights.find((f) => f.id === flightId) ?? null };
    },
  );

  registerTool(
    server,
    "update_flight",
    {
      title: "Update a flight",
      description:
        "Change a flight's details, seats or notes. Only the fields you pass are changed; the rest stay as they are.",
      inputSchema: z.object({
        flight_id: z.string().describe("The id of the flight to update."),
        ...flightFields,
      }),
      write: true,
    },
    async ({ flight_id, ...rest }, principal) => {
      const current = await loadFlight(principal.supabase, flight_id);
      await updateFlight(
        principal.supabase,
        flight_id,
        current.trip_id,
        mergeFlightInput(current, rest),
      );
      const flights = await loadFlights(principal.supabase, current.trip_id);
      return { flight: flights.find((f) => f.id === flight_id) ?? null };
    },
  );

  registerTool(
    server,
    "delete_flight",
    {
      title: "Delete a flight",
      description: "Remove a flight from a trip.",
      inputSchema: z.object({
        flight_id: z.string().describe("The id of the flight to delete."),
      }),
      write: true,
    },
    async ({ flight_id }, principal) => {
      const tripId = await flightTripId(principal.supabase, flight_id);
      await deleteFlight(principal.supabase, flight_id, tripId);
      return { deleted: true, flight_id };
    },
  );
}
