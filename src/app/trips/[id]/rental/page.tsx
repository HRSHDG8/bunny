import { getRentals } from "@/lib/data";
import { RentalsManager } from "@/components/rental/rentals-manager";

export const metadata = { title: "Rental" };

export default async function RentalPage(
  props: PageProps<"/trips/[id]/rental">,
) {
  const { id } = await props.params;
  const rentals = await getRentals(id);
  return <RentalsManager tripId={id} rentals={rentals} />;
}