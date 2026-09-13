import { getRentals, getTrip, getTripPeople, isTripCompleted } from "@/lib/data";
import { RentalsManager } from "@/components/rental/rentals-manager";

export const metadata = { title: "Rental" };

export default async function RentalPage(
  props: PageProps<"/trips/[id]/rental">,
) {
  const { id } = await props.params;
  const [rentals, people, trip] = await Promise.all([
    getRentals(id),
    getTripPeople(id),
    getTrip(id),
  ]);
  return (
    <RentalsManager
      tripId={id}
      rentals={rentals}
      people={people}
      locked={isTripCompleted(trip)}
    />
  );
}