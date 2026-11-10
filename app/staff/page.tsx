import Link from "next/link";
import { requireRole } from "@/lib/supabase/server";
import type { Booking, BookingStatus } from "@/lib/types";
import { baht, hhmm, PET_EMOJI, PET_LABEL, STATUS_LABEL, thaiDate, todayBkk } from "@/lib/utils";
import { StaffSelect, StatusSelect } from "./BookingControls";

export default async function StaffQueue({
  searchParams,
}: { searchParams: Promise<{ date?: string; status?: string; q?: string; mine?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireRole(["staff", "owner"], "/staff");
  const date = sp.date ?? todayBkk();

  let query = supabase.from("bookings")
    .select("*, services(name), staff:profiles!bookings_staff_id_fkey(full_name)")
    .eq("booking_date", date).order("start_time");
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.mine) query = query.eq("staff_id", user.id);
  if (sp.q) {
    const q = sp.q.replace(/[%,()]/g, "");
    query = query.or(`phone.ilike.%${q}%,customer_name.ilike.%${q}%,pet_name.ilike.%${q}%,booking_code.ilike.%${q}%`);
  }

  const [{ data, error }, { data: team }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name").in("role", ["staff", "owner"]).order("full_name"),
  ]);
  const bookings = (data ?? []) as Booking[];
  const active = bookings.filter((b) => b.status !== "cancelled");

  const shift = (n: number) => {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ date, status: sp.status, q: sp.q, mine: sp.mine, ...extra })
      .forEach(([k, v]) => v && p.set(k, v));
    return `/staff?${p}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">คิวร้าน · {thaiDate(date)}</h1>
          <p className="text-sm text-stone-500">สวัสดีคุณ{profile.full_name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={qs({ date: shift(-1) })} className="btn-outline">‹</Link>
          <Link href={qs({ date: todayBkk() })} className="btn-outline">วันนี้</Link>
          <Link href={qs({ date: shift(1) })} className="btn-outline">›</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="คิวทั้งหมด" value={active.length} />
        <Stat label="รอยืนยัน" value={bookings.filter((b) => b.status === "pending").length} />
        <Stat label="ยังไม่ระบุช่าง" value={active.filter((b) => !b.staff_id).length} />
        <Stat label="งานของฉัน" value={active.filter((b) => b.staff_id === user.id).length} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={qs({ mine: undefined })} className={`rounded-full px-3 py-1 ${!sp.mine ? "bg-stone-800 text-white" : "bg-stone-100"}`}>ทั้งหมด</Link>
        <Link href={qs({ mine: "1" })} className={`rounded-full px-3 py-1 ${sp.mine ? "bg-stone-800 text-white" : "bg-stone-100"}`}>งานของฉัน</Link>
      </div>

      <form className="card flex flex-wrap gap-2">
        <input type="date" name="date" defaultValue={date} className="input w-auto" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
          <option value="">ทุกสถานะ</option>
          {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {sp.mine && <input type="hidden" name="mine" value="1" />}
        <input name="q" defaultValue={sp.q} placeholder="ค้นหา ชื่อ / เบอร์ / ชื่อสัตว์ / รหัส" className="input flex-1" />
        <button className="btn">กรอง</button>
      </form>

      {error && <p className="text-red-600">{error.message}</p>}
      {bookings.length === 0 && <p className="py-10 text-center text-stone-500">ไม่มีคิว</p>}

      <div className="space-y-3">
        {bookings.map((b) => (
          <div key={b.id}
            className={`card grid gap-3 sm:grid-cols-[90px_1fr_auto] ${b.status === "cancelled" ? "opacity-50" : ""} ${b.staff_id === user.id ? "border-l-4 border-l-sky-400" : ""}`}>
            <div>
              <div className="text-lg font-semibold">{hhmm(b.start_time)}</div>
              <div className="text-xs text-stone-500">ถึง {hhmm(b.end_time)}</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">{b.services?.name} <span className="font-normal text-brand-700">· {baht(b.price)}</span></div>
              <div>
                {PET_EMOJI[b.pet_type]} {b.pet_name} ({PET_LABEL[b.pet_type]}{b.pet_breed ? ` · ${b.pet_breed}` : ""}{b.pet_weight ? ` · ${b.pet_weight} กก.` : ""})
              </div>
              <div>👤 {b.customer_name} · <a href={`tel:${b.phone}`} className="text-sky-700 hover:underline">{b.phone}</a></div>
              {b.note && <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-900">📝 {b.note}</div>}
              <div className="mt-1 font-mono text-xs text-stone-400">#{b.booking_code}</div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <StatusSelect id={b.id} status={b.status} />
              <StaffSelect id={b.id} staffId={b.staff_id} team={team ?? []} />
            </div>
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
