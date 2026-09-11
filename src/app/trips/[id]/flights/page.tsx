import { getFlights } from "@/lib/data";
import { FlightsManager } from "@/components/flights/flights-manager";

export const metadata = { title: "Flights" };

export default async function FlightsPage(
  props: PageProps<"/trips/[id]/flights">,
) {
  const { id } = await props.params;
  const flights = await getFlights(id);
  return <FlightsManager tripId={id} flights={flights} />;
}