import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Service, ShopSettings } from "@/lib/types";
import { baht, EVENT_COLOR, EVENT_LABEL, hhmm, PET_LABEL, thaiDate, todayBkk, WEEKDAYS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: services }, { data: settings }, { data: upcoming }] = await Promise.all([
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("shop_settings").select("*").single(),
    supabase.from("calendar_events").select("*").gte("end_date", todayBkk()).order("start_date").limit(4),
  ]);
  const events = (upcoming ?? []) as CalendarEvent[];
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

      {events.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">ข่าวสารจากร้าน</h2>
            <Link href="/calendar" className="text-sm text-brand-700 hover:underline">ดูปฏิทินทั้งหมด →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((e) => (
              <Link key={e.id} href={`/calendar?month=${e.start_date.slice(0, 7)}&date=${e.start_date}`} className="card flex gap-3 p-4 hover:border-brand-300">
                <span className={`h-fit shrink-0 rounded-full px-2 py-0.5 text-xs ${EVENT_COLOR[e.event_type]}`}>{EVENT_LABEL[e.event_type]}</span>
                <span>
                  <span className="block font-medium">{e.title}</span>
                  <span className="text-xs text-stone-500">
                    {thaiDate(e.start_date)}{e.end_date !== e.start_date && ` – ${thaiDate(e.end_date)}`}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
