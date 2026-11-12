export type Role = "customer" | "staff" | "owner";
export type PetType = "dog" | "cat" | "other";
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: Role;
  created_at: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  pet_type: PetType;
  breed: string | null;
  weight: number | null;
  note: string | null;
}

export type EventType = "holiday" | "event" | "promotion" | "notice";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  event_type: EventType;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  pet_type: "dog" | "cat" | "all";
  is_active: boolean;
  sort_order: number;
}

export interface ShopSettings {
  shop_name: string;
  phone: string | null;
  open_time: string;
  close_time: string;
  slot_minutes: number;
  staff_count: number;
  closed_weekdays: number[];
  max_days_ahead: number;
}

export interface Booking {
  id: string;
  booking_code: string;
  user_id: string | null;
  pet_id: string | null;
  staff_id: string | null;
  service_id: string;
  customer_name: string;
  phone: string;
  pet_name: string;
  pet_type: PetType;
  pet_breed: string | null;
  pet_weight: number | null;
  note: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  price: number;
  status: BookingStatus;
  created_at: string;
  services?: { name: string } | null;
  staff?: { full_name: string } | null;
}
