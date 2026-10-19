export type ArrivalMethod = "flight" | "train" | "drive" | "cruise" | "other";

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  arrival_method: ArrivalMethod | null;
  arrival_notes: string | null;
  share_token: string | null;
  share_emails: string[];
  created_at: string;
  updated_at: string;
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: "editor" | "viewer";
  joined_at: string;
}

export interface TripPerson {
  user_id: string;
  full_name: string;
  email: string | null;
  is_owner: boolean;
}

export interface TripPreview {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
}

export interface FlightPassenger {
  flight_id: string;
  trip_id: string;
  user_id: string;
  seat: string | null;
  created_at: string;
}

export interface Flight {
  id: string;
  trip_id: string;
  airline: string | null;
  flight_number: string | null;
  departure_place: string | null;
  departure_code: string | null;
  /** Wall clock at the departure airport (no zone). */
  departure_time: string | null;
  /** IANA zone of the departure airport, e.g. "Europe/Lisbon". */
  departure_tz: string | null;
  /** True instant derived from departure_time + departure_tz. */
  departure_at: string | null;
  arrival_place: string | null;
  arrival_code: string | null;
  /** Wall clock at the arrival airport (no zone). */
  arrival_time: string | null;
  arrival_tz: string | null;
  arrival_at: string | null;
  /** Shared by all legs of one connecting journey; null = standalone. */
  journey_id: string | null;
  booking_ref: string | null;
  notes: string | null;
  flight_passengers: FlightPassenger[];
  created_at: string;
  updated_at: string;
}

export interface Rental {
  id: string;
  trip_id: string;
  driver_ids: string[];
  company: string | null;
  booking_ref: string | null;
  car_model: string | null;
  car_plate: string | null;
  pickup_place: string | null;
  pickup_time: string | null;
  dropoff_place: string | null;
  dropoff_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  title: string;
  place_name: string | null;
  lat: number | null;
  lng: number | null;
  start_time: string | null; // "HH:MM:SS"
  end_time: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lon: number;
  osm_type?: string;
  osm_id?: number;
}