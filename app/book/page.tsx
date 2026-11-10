import { createClient } from "@/lib/supabase/server";
import type { Service, ShopSettings } from "@/lib/types";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const supabase = await createClient();
  const [{ data: services }, { data: settings }] = await Promise.all([
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("shop_settings").select("*").single(),
  ]);

  if (!settings) return <p className="text-red-600">ไม่สามารถโหลดข้อมูลร้านได้ กรุณาตรวจสอบการตั้งค่า Supabase</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">จองคิว</h1>
      <BookingForm
        services={(services ?? []) as Service[]}
        settings={settings as ShopSettings}
        initialServiceId={service}
      />
    </div>
  );
}
