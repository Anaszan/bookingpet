import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Service, ShopSettings } from "@/lib/types";
import { baht, hhmm, PET_LABEL, WEEKDAYS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: services }, { data: settings }] = await Promise.all([
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("shop_settings").select("*").single(),
  ]);
  const s = settings as ShopSettings | null;

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-brand-100 to-amber-50 p-8 sm:p-12">
        <h1 className="text-3xl font-semibold sm:text-4xl">อาบน้ำ ตัดขน สปา<br />ให้น้องหมาน้องแมวของคุณ</h1>
        <p className="mt-3 text-stone-600">จองคิวออนไลน์ได้ตลอด 24 ชม. เลือกบริการ วัน และเวลาที่สะดวก</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/book" className="btn px-6 py-3 text-lg">จองคิวเลย</Link>
          <Link href="/account" className="btn-outline px-6 py-3 text-lg">คิวของฉัน</Link>
        </div>
        {s && (
          <p className="mt-6 text-sm text-stone-600">
            เปิดบริการ {hhmm(s.open_time)}–{hhmm(s.close_time)} น.
            {s.closed_weekdays.length > 0 && ` · หยุดวัน${s.closed_weekdays.map((d) => WEEKDAYS[d]).join(", ")}`}
            {s.phone && ` · โทร ${s.phone}`}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">บริการของเรา</h2>
        {!services?.length && <p className="text-stone-500">ยังไม่มีบริการ (ตรวจสอบการเชื่อมต่อ Supabase)</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(services as Service[] | null)?.map((sv) => (
            <div key={sv.id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{sv.name}</h3>
                <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                  {PET_LABEL[sv.pet_type]}
                </span>
              </div>
              <p className="mt-1 flex-1 text-sm text-stone-500">{sv.description}</p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-lg font-semibold text-brand-700">{baht(sv.price)}</div>
                  <div className="text-xs text-stone-500">ประมาณ {sv.duration_minutes} นาที</div>
                </div>
                <Link href={`/book?service=${sv.id}`} className="btn text-sm">จอง</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
