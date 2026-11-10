import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Booking, BookingStatus } from "@/lib/types";
import { baht, hhmm, PET_LABEL, STATUS_LABEL, thaiDate, todayBkk } from "@/lib/utils";
import StatusSelect from "./StatusSelect";

export default async function AdminBookings({
  searchParams,
}: { searchParams: Promise<{ date?: string; status?: string; q?: string }> }) {
  const sp = await searchParams;
  const date = sp.date ?? todayBkk();
  const supabase = await createClient();

  let query = supabase.from("bookings").select("*, services(name)")
    .eq("booking_date", date).order("start_time");
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.q) query = query.or(`phone.ilike.%${sp.q.replace(/[%,()]/g, "")}%,customer_name.ilike.%${sp.q.replace(/[%,()]/g, "")}%,booking_code.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  const { data, error } = await query;
  const bookings = (data ?? []) as Booking[];

  const active = bookings.filter((b) => b.status !== "cancelled");
  const revenue = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + Number(b.price), 0);
  const shift = (n: number) => {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">คิววันที่ {thaiDate(date)}</h1>
        <div className="flex gap-2">
          <Link href={`/admin?date=${shift(-1)}`} className="btn-outline">‹</Link>
          <Link href="/admin" className="btn-outline">วันนี้</Link>
          <Link href={`/admin?date=${shift(1)}`} className="btn-outline">›</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="คิวทั้งหมด" value={active.length} />
        <Stat label="รอยืนยัน" value={bookings.filter((b) => b.status === "pending").length} />
        <Stat label="เสร็จสิ้น" value={bookings.filter((b) => b.status === "completed").length} />
        <Stat label="รายได้ (เสร็จแล้ว)" value={baht(revenue)} />
      </div>

      <form className="card flex flex-wrap gap-2">
        <input type="date" name="date" defaultValue={date} className="input w-auto" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
          <option value="">ทุกสถานะ</option>
          {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <input name="q" defaultValue={sp.q} placeholder="ค้นหา ชื่อ / เบอร์ / รหัส" className="input flex-1" />
        <button className="btn">กรอง</button>
      </form>

      {error && <p className="text-red-600">{error.message}</p>}
      {bookings.length === 0 && <p className="py-10 text-center text-stone-500">ไม่มีคิวในวันนี้</p>}

      <div className="space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className={`card grid gap-3 sm:grid-cols-[90px_1fr_auto] ${b.status === "cancelled" ? "opacity-50" : ""}`}>
            <div>
              <div className="text-lg font-semibold">{hhmm(b.start_time)}</div>
              <div className="text-xs text-stone-500">ถึง {hhmm(b.end_time)}</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">{b.services?.name} <span className="font-normal text-brand-700">· {baht(b.price)}</span></div>
              <div>
                🐾 {b.pet_name} ({PET_LABEL[b.pet_type]}{b.pet_breed ? ` · ${b.pet_breed}` : ""}{b.pet_weight ? ` · ${b.pet_weight} กก.` : ""})
              </div>
              <div>👤 {b.customer_name} · <a href={`tel:${b.phone}`} className="text-sky-700 hover:underline">{b.phone}</a></div>
              {b.note && <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-900">📝 {b.note}</div>}
              <div className="mt-1 font-mono text-xs text-stone-400">#{b.booking_code}</div>
            </div>
            <StatusSelect id={b.id} status={b.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
