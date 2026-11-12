"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/server";

const back = (date: string) => `/calendar?month=${date.slice(0, 7)}&date=${date}`;

export async function saveEvent(formData: FormData) {
  const { supabase } = await requireRole(["staff", "owner"]);
  const id = String(formData.get("id") ?? "");
  const start = String(formData.get("start_date") ?? "");
  const endRaw = String(formData.get("end_date") ?? "");
  const end = endRaw && endRaw >= start ? endRaw : start;
  const row = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    start_date: start,
    end_date: end,
    event_type: String(formData.get("event_type") ?? "event"),
  };
  if (!row.title || !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error("กรุณากรอกหัวข้อและวันที่");

  const { error } = id
    ? await supabase.from("calendar_events").update(row).eq("id", id)
    : await supabase.from("calendar_events").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(back(start));
}

export async function deleteEvent(id: string, date: string) {
  const { supabase } = await requireRole(["staff", "owner"]);
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(back(date));
}
