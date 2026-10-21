import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { createTrip, type TripInput } from "@/lib/services/trips";
import { createFlight, type FlightInput } from "@/lib/services/flights";
import { createRental, type RentalInput } from "@/lib/services/rentals";
import { createItineraryItem, type ItineraryInput } from "@/lib/services/itinerary";
import { registerTool, dateString, dateTimeString, timeString, uuid } from "@/lib/mcp/tools/shared";
import { loadTrip, tripSummary } from "@/lib/mcp/tools/queries";

const flightShape = z.object({
  airline: z.string().optional(),
  flight_number: z.string().optional(),
  departure_place: z.string().optional(),
  departure_code: z.string().optional(),
  departure_time: dateTimeString.optional(),
  arrival_place: z.string().optional(),
  arrival_code: z.string().optional(),
  arrival_time: dateTimeString.optional(),
  booking_ref: z.string().optional(),
  notes: z.string().optional(),
  passengers: z
    .array(z.object({ user_id: uuid, seat: z.string().optional() }))
    .optional(),
});

const rentalShape = z.object({
  driver_ids: z.array(uuid).optional(),
  company: z.string().optional(),
  booking_ref: z.string().optional(),
  car_model: z.string().optional(),
  car_plate: z.string().optional(),
  pickup_place: z.string().optional(),
  pickup_time: dateTimeString.optional(),
  dropoff_place: z.string().optional(),
  dropoff_time: dateTimeString.optional(),
  notes: z.string().optional(),
});

const itemShape = z.object({
  day_number: z.number().int().min(1),
  title: z.string(),
  place_name: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  start_time: timeString.optional(),
  end_time: timeString.optional(),
  notes: z.string().optional(),
});

export function registerPlanTools(server: McpServer) {
  registerTool(
    server,
    "plan_trip",
    {
      title: "Plan a whole trip",
      description:
        "Plan a trip in one go: create the trip (or add to an existing one) and fill it with flights, a car rental and a day-by-day itinerary. Everything is optional except the trip details, and each piece is added separately so a failure in one doesn't lose the rest.",
      inputSchema: z.object({
        trip_id: z
          .string()
          .describe("Add to this existing trip instead of creating a new one.")
          .optional(),
        title: z.string().describe("The name of the trip.").optional(),
        destination: z.string().describe("Where the trip goes.").optional(),
        start_date: dateString.describe("First day of the trip (YYYY-MM-DD).").optional(),
        end_date: dateString.describe("Last day of the trip (YYYY-MM-DD).").optional(),
        arrival_method: z
          .enum(["flight", "train", "drive", "cruise", "other"])
          .optional(),
        arrival_notes: z.string().optional(),
        flights: z.array(flightShape).describe("Flights to add.").optional(),
        rental: rentalShape.describe("A car rental to add.").optional(),
        itinerary: z
          .array(itemShape)
          .describe("Activities, one entry per plan item.")
          .optional(),
      }),
      write: true,
    },
    async (args, principal) => {
      const created: string[] = [];
      const failed: { step: string; error: string }[] = [];

      let tripId = args.trip_id ?? "";
      if (!tripId) {
        if (!args.title || !args.destination || !args.start_date || !args.end_date) {
          throw new Error(
            "To plan a new trip I need a title, destination, start_date and end_date.",
          );
        }
        const input: TripInput = {
          title: args.title,
          destination: args.destination,
          start_date: args.start_date,
          end_date: args.end_date,
          arrival_method: args.arrival_method ?? "",
          arrival_notes: args.arrival_notes ?? "",
        };
        tripId = await createTrip(principal.supabase, principal.userId, input);
        created.push(`trip ${tripId}`);
      }

      // Flights are chained into one journey when they connect: the next leg
      // has to leave from where the previous one lands.
      let previousFlightId: string | null = null;
      let previousArrivalCode = "";
      for (const [index, flight] of (args.flights ?? []).entries()) {
        try {
          const departureCode = (flight.departure_code ?? "").trim().toUpperCase();
          const connects =
            previousFlightId !== null &&
            previousArrivalCode !== "" &&
            departureCode !== "" &&
            previousArrivalCode === departureCode;
          const input: FlightInput = {
            airline: flight.airline ?? "",
            flight_number: flight.flight_number ?? "",
            departure_place: flight.departure_place ?? "",
            departure_code: flight.departure_code ?? "",
            departure_time: flight.departure_time ?? "",
            arrival_place: flight.arrival_place ?? "",
            arrival_code: flight.arrival_code ?? "",
            arrival_time: flight.arrival_time ?? "",
            journey_id: connects ? previousFlightId : null,
            booking_ref: flight.booking_ref ?? "",
            notes: flight.notes ?? "",
            passengers: (flight.passengers ?? []).map((p) => ({
              user_id: p.user_id,
              seat: p.seat ?? "",
            })),
          };
          const id = await createFlight(principal.supabase, tripId, input);
          previousFlightId = id;
          previousArrivalCode = (flight.arrival_code ?? "").trim().toUpperCase();
          created.push(`flight ${id}`);
        } catch (error) {
          failed.push({
            step: `flight ${index + 1}`,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (args.rental) {
        try {
          const input: RentalInput = {
            driver_ids: args.rental.driver_ids ?? [],
            company: args.rental.company ?? "",
            booking_ref: args.rental.booking_ref ?? "",
            car_model: args.rental.car_model ?? "",
            car_plate: args.rental.car_plate ?? "",
            pickup_place: args.rental.pickup_place ?? "",
            pickup_time: args.rental.pickup_time ?? "",
            dropoff_place: args.rental.dropoff_place ?? "",
            dropoff_time: args.rental.dropoff_time ?? "",
            notes: args.rental.notes ?? "",
          };
          const id = await createRental(principal.supabase, tripId, input);
          created.push(`rental ${id}`);
        } catch (error) {
          failed.push({
            step: "rental",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      for (const [index, item] of (args.itinerary ?? []).entries()) {
        try {
          const input: ItineraryInput = {
            day_number: item.day_number,
            title: item.title,
            place_name: item.place_name ?? "",
            lat: item.lat ?? null,
            lng: item.lng ?? null,
            start_time: item.start_time ?? "",
            end_time: item.end_time ?? "",
            notes: item.notes ?? "",
          };
          const id = await createItineraryItem(principal.supabase, tripId, input);
          created.push(`activity ${id}`);
        } catch (error) {
          failed.push({
            step: `activity ${index + 1}`,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const trip = await loadTrip(principal.supabase, tripId);
      return {
        trip: tripSummary(trip),
        created,
        failed,
        ok: failed.length === 0,
      };
    },
  );
}
