"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const { supabase } = await requireRole(["staff", "owner"]);
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}

export async function assignStaff(id: string, staffId: string | null) {
  const { supabase } = await requireRole(["staff", "owner"]);
  const { error } = await supabase.from("bookings").update({ staff_id: staffId }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}
