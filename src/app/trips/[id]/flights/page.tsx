import { getFlights, getTrip, getTripPeople, isTripCompleted } from "@/lib/data";
import { FlightsManager } from "@/components/flights/flights-manager";

export const metadata = { title: "Flights" };

export default async function FlightsPage(
  props: PageProps<"/trips/[id]/flights">,
) {
  const { id } = await props.params;
  const [flights, people, trip] = await Promise.all([
    getFlights(id),
    getTripPeople(id),
    getTrip(id),
  ]);
  return (
    <FlightsManager
      tripId={id}
      flights={flights}
      people={people}
      locked={isTripCompleted(trip)}
    />
  );
}