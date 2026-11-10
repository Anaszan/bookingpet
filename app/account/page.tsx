import Link from "next/link";
import { requireRole } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";
import { baht, hhmm, PET_EMOJI, STATUS_COLOR, STATUS_LABEL, thaiDate, todayBkk } from "@/lib/utils";
import CancelButton from "./CancelButton";

export default async function MyBookings() {
  const { supabase, user, profile } = await requireRole(["customer", "staff", "owner"], "/account");
  const { data } = await supabase.from("bookings").select("*, services(name)")
    .eq("user_id", user.id).order("booking_date", { ascending: false }).order("start_time", { ascending: false });
  const bookings = (data ?? []) as Booking[];

  const today = todayBkk();
  const isUpcoming = (b: Booking) => b.booking_date >= today && !["completed", "cancelled"].includes(b.status);
  const upcoming = bookings.filter(isUpcoming).reverse();
  const history = bookings.filter((b) => !isUpcoming(b));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">คิวของฉัน</h1>
          <p className="text-sm text-stone-500">สวัสดีคุณ{profile.full_name}</p>
        </div>
        <Link href="/book" className="btn">+ จองคิวใหม่</Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">คิวที่กำลังจะมาถึง</h2>
        {upcoming.length === 0 && <p className="card text-center text-stone-500">ยังไม่มีคิว</p>}
        {upcoming.map((b) => <BookingCard key={b.id} b={b} canCancel={["pending", "confirmed"].includes(b.status)} />)}
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">ประวัติ</h2>
          {history.map((b) => <BookingCard key={b.id} b={b} />)}
        </section>
      )}
    </div>
  );
}

function BookingCard({ b, canCancel }: { b: Booking; canCancel?: boolean }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs text-stone-400">#{b.booking_code}</div>
          <div className="font-medium">{b.services?.name}</div>
          <div className="text-sm text-stone-600">{PET_EMOJI[b.pet_type]} {b.pet_name} · {baht(b.price)}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${STATUS_COLOR[b.status]}`}>{STATUS_LABEL[b.status]}</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm">📅 {thaiDate(b.booking_date)} · {hhmm(b.start_time)}–{hhmm(b.end_time)} น.</div>
        {canCancel && <CancelButton id={b.id} code={b.booking_code} />}
      </div>
    </div>
  );
}
