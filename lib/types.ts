export type PetType = "dog" | "cat" | "other";
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

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
}
