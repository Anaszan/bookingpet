import { requireRole } from "@/lib/supabase/server";
import type { Pet, Service, ShopSettings } from "@/lib/types";
import { expandDates, todayBkk } from "@/lib/utils";
import BookingForm from "./BookingForm";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const { supabase, user, profile } = await requireRole(
    ["customer", "staff", "owner"],
    service ? `/book?service=${service}` : "/book"
  );

  const [{ data: services }, { data: settings }, { data: pets }, { data: holidays }] = await Promise.all([
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("shop_settings").select("*").single(),
    supabase.from("pets").select("*").eq("owner_id", user.id).order("created_at"),
    supabase.from("calendar_events").select("start_date, end_date")
      .eq("event_type", "holiday").gte("end_date", todayBkk()),
  ]);
  const holidayDates = [...expandDates(holidays ?? [])];

  if (!settings) return <p className="text-red-600">ไม่สามารถโหลดข้อมูลร้านได้ กรุณาตรวจสอบการตั้งค่า Supabase</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">จองคิว</h1>
      <BookingForm
        services={(services ?? []) as Service[]}
        settings={settings as ShopSettings}
        pets={(pets ?? []) as Pet[]}
        profile={profile}
        initialServiceId={service}
        holidayDates={holidayDates}
      />
    </div>
  );
}
