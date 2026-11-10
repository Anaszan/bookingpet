"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/server";

const ANY = ["customer", "staff", "owner"] as const;

export async function savePet(formData: FormData) {
  const { supabase, user } = await requireRole([...ANY]);
  const id = String(formData.get("id") ?? "");
  const weight = String(formData.get("weight") ?? "");
  const row = {
    name: String(formData.get("name") ?? "").trim(),
    pet_type: String(formData.get("pet_type")),
    breed: String(formData.get("breed") ?? "").trim() || null,
    weight: weight ? Number(weight) : null,
    note: String(formData.get("note") ?? "").trim() || null,
  };
  const { error } = id
    ? await supabase.from("pets").update(row).eq("id", id).eq("owner_id", user.id)
    : await supabase.from("pets").insert({ ...row, owner_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/account/pets");
  redirect("/account/pets");
}

export async function deletePet(id: string) {
  const { supabase, user } = await requireRole([...ANY]);
  await supabase.from("pets").delete().eq("id", id).eq("owner_id", user.id);
  revalidatePath("/account/pets");
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireRole([...ANY]);
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  if (phone && !/^0\d{8,9}$/.test(phone)) redirect("/account/profile?error=phone");
  const { error } = await supabase.from("profiles").update({
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: phone || null,
  }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/account/profile?saved=1");
}
