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
  created_at: string;
  updated_at: string;
}

export interface Flight {
  id: string;
  trip_id: string;
  airline: string | null;
  flight_number: string | null;
  departure_place: string | null;
  departure_code: string | null;
  departure_time: string | null;
  arrival_place: string | null;
  arrival_code: string | null;
  arrival_time: string | null;
  booking_ref: string | null;
  seat: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rental {
  id: string;
  trip_id: string;
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