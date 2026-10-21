import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  createRental,
  deleteRental,
  updateRental,
  type RentalInput,
} from "@/lib/services/rentals";
import { apiError } from "@/lib/supabase/errors";
import { registerTool, dateTimeString, merged, uuid } from "@/lib/mcp/tools/shared";
import { loadRental, loadRentals } from "@/lib/mcp/tools/queries";
import type { Rental } from "@/lib/types";

const rentalFields = {
  driver_ids: z
    .array(uuid)
    .describe("Bunny user ids of the people driving the car.")
    .optional(),
  company: z.string().describe("Rental company, e.g. 'Sixt'.").optional(),
  booking_ref: z.string().describe("Booking reference.").optional(),
  car_model: z.string().describe("Car model, e.g. 'Fiat 500'.").optional(),
  car_plate: z.string().describe("Number plate.").optional(),
  pickup_place: z.string().describe("Where the car is picked up.").optional(),
  pickup_time: dateTimeString
    .describe("Pickup time (YYYY-MM-DDTHH:MM).")
    .optional(),
  dropoff_place: z.string().describe("Where the car is dropped off.").optional(),
  dropoff_time: dateTimeString
    .describe("Drop-off time (YYYY-MM-DDTHH:MM).")
    .optional(),
  notes: z.string().describe("Anything worth remembering about the rental.").optional(),
};

function toRentalInput(args: Record<string, unknown>): RentalInput {
  return {
    driver_ids: (args.driver_ids as string[]) ?? [],
    company: (args.company as string) ?? "",
    booking_ref: (args.booking_ref as string) ?? "",
    car_model: (args.car_model as string) ?? "",
    car_plate: (args.car_plate as string) ?? "",
    pickup_place: (args.pickup_place as string) ?? "",
    pickup_time: (args.pickup_time as string) ?? "",
    dropoff_place: (args.dropoff_place as string) ?? "",
    dropoff_time: (args.dropoff_time as string) ?? "",
    notes: (args.notes as string) ?? "",
  };
}

/** Keep whatever the caller didn't mention, so a partial edit stays partial. */
function mergeRentalInput(current: Rental, args: Record<string, unknown>): RentalInput {
  const text = (key: string, fallback: string | null) =>
    merged(args[key] as string | undefined, fallback, "");
  return {
    driver_ids:
      args.driver_ids === undefined
        ? current.driver_ids
        : ((args.driver_ids as string[]) ?? []),
    company: text("company", current.company),
    booking_ref: text("booking_ref", current.booking_ref),
    car_model: text("car_model", current.car_model),
    car_plate: text("car_plate", current.car_plate),
    pickup_place: text("pickup_place", current.pickup_place),
    pickup_time: text("pickup_time", current.pickup_time),
    dropoff_place: text("dropoff_place", current.dropoff_place),
    dropoff_time: text("dropoff_time", current.dropoff_time),
    notes: text("notes", current.notes),
  };
}

async function rentalTripId(
  supabase: Parameters<typeof loadRentals>[0],
  rentalId: string,
) {
  const { data, error } = await supabase
    .from("rentals")
    .select("trip_id")
    .eq("id", rentalId)
    .maybeSingle();
  if (error) throw apiError("Couldn't load the rental.", error);
  if (!data)
    throw new Error("That rental doesn't exist, or you don't have access to it.");
  return data.trip_id as string;
}

export function registerRentalTools(server: McpServer) {
  registerTool(
    server,
    "list_rentals",
    {
      title: "List car rentals",
      description: "List the car rentals on a trip.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
      }),
    },
    async ({ trip_id }, principal) => {
      const rentals = await loadRentals(principal.supabase, trip_id);
      return { trip_id, rentals };
    },
  );

  registerTool(
    server,
    "create_rental",
    {
      title: "Add a car rental",
      description: "Add a car rental to a trip, with pickup and drop-off details.",
      inputSchema: z.object({
        trip_id: z.string().describe("The id of the trip."),
        ...rentalFields,
      }),
      write: true,
    },
    async ({ trip_id, ...rest }, principal) => {
      const rentalId = await createRental(
        principal.supabase,
        trip_id,
        toRentalInput(rest),
      );
      const rentals = await loadRentals(principal.supabase, trip_id);
      return { rental: rentals.find((r) => r.id === rentalId) ?? null };
    },
  );

  registerTool(
    server,
    "update_rental",
    {
      title: "Update a car rental",
      description:
        "Change a car rental's details, drivers or notes. Only the fields you pass are changed; the rest stay as they are.",
      inputSchema: z.object({
        rental_id: z.string().describe("The id of the rental to update."),
        ...rentalFields,
      }),
      write: true,
    },
    async ({ rental_id, ...rest }, principal) => {
      const current = await loadRental(principal.supabase, rental_id);
      await updateRental(
        principal.supabase,
        rental_id,
        current.trip_id,
        mergeRentalInput(current, rest),
      );
      const rentals = await loadRentals(principal.supabase, current.trip_id);
      return { rental: rentals.find((r) => r.id === rental_id) ?? null };
    },
  );

  registerTool(
    server,
    "delete_rental",
    {
      title: "Delete a car rental",
      description: "Remove a car rental from a trip.",
      inputSchema: z.object({
        rental_id: z.string().describe("The id of the rental to delete."),
      }),
      write: true,
    },
    async ({ rental_id }, principal) => {
      const tripId = await rentalTripId(principal.supabase, rental_id);
      await deleteRental(principal.supabase, rental_id, tripId);
      return { deleted: true, rental_id };
    },
  );
}
