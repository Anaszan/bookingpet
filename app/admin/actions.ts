"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin, createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";

async function requireAdmin() {
  const { supabase, user } = await getAdmin();
  if (!user) redirect("/admin/login");
  return supabase;
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function saveService(formData: FormData) {
  const supabase = await requireAdmin();
  const id = formData.get("id") as string;
  const row = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    price: Number(formData.get("price")),
    duration_minutes: Number(formData.get("duration_minutes")),
    pet_type: formData.get("pet_type") as string,
    sort_order: Number(formData.get("sort_order") || 0),
    is_active: formData.get("is_active") === "on",
  };
  const { error } = id
    ? await supabase.from("services").update(row).eq("id", id)
    : await supabase.from("services").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/services");
  redirect("/admin/services");
}

export async function toggleService(id: string, is_active: boolean) {
  const supabase = await requireAdmin();
  await supabase.from("services").update({ is_active }).eq("id", id);
  revalidatePath("/admin/services");
}

export async function saveSettings(formData: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("shop_settings").update({
    shop_name: String(formData.get("shop_name") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
    open_time: formData.get("open_time"),
    close_time: formData.get("close_time"),
    slot_minutes: Number(formData.get("slot_minutes")),
    staff_count: Number(formData.get("staff_count")),
    max_days_ahead: Number(formData.get("max_days_ahead")),
    closed_weekdays: formData.getAll("closed_weekdays").map(Number),
  }).eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
