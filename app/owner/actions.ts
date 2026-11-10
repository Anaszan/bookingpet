"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const owner = () => requireRole(["owner"]);

export async function saveService(formData: FormData) {
  const { supabase } = await owner();
  const id = String(formData.get("id") ?? "");
  const row = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    price: Number(formData.get("price")),
    duration_minutes: Number(formData.get("duration_minutes")),
    pet_type: String(formData.get("pet_type")),
    sort_order: Number(formData.get("sort_order") || 0),
    is_active: formData.get("is_active") === "on",
  };
  const { error } = id
    ? await supabase.from("services").update(row).eq("id", id)
    : await supabase.from("services").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/owner/services");
  redirect("/owner/services");
}

export async function toggleService(id: string, is_active: boolean) {
  const { supabase } = await owner();
  await supabase.from("services").update({ is_active }).eq("id", id);
  revalidatePath("/owner/services");
}

export async function saveSettings(formData: FormData) {
  const { supabase } = await owner();
  const { error } = await supabase.from("shop_settings").update({
    shop_name: String(formData.get("shop_name") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
    open_time: String(formData.get("open_time")),
    close_time: String(formData.get("close_time")),
    slot_minutes: Number(formData.get("slot_minutes")),
    staff_count: Number(formData.get("staff_count")),
    max_days_ahead: Number(formData.get("max_days_ahead")),
    closed_weekdays: formData.getAll("closed_weekdays").map(Number),
  }).eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/owner/settings?saved=1");
}

export async function setRole(userId: string, role: Role) {
  const { supabase, user } = await owner();
  if (userId === user.id) throw new Error("ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้");
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/owner/team");
}
