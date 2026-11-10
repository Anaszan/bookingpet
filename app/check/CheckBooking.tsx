"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/lib/types";
import { baht, hhmm, STATUS_COLOR, STATUS_LABEL, thaiDate, todayBkk } from "@/lib/utils";

type Row = {
  booking_code: string; service_name: string; pet_name: string; booking_date: string;
  start_time: string; end_time: string; price: number; status: BookingStatus;
};

export default function CheckBooking({ initialPhone }: { initialPhone: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [phone, setPhone] = useState(initialPhone);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const search = useCallback(async (p: string) => {
    const clean = p.replace(/\D/g, "");
    if (!clean) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("find_my_bookings", { p_phone: clean });
    setLoading(false);
    setMsg(error ? error.message : "");
    setRows((data as Row[]) ?? []);
  }, [supabase]);

  useEffect(() => { if (initialPhone) search(initialPhone); }, [initialPhone, search]);

  async function cancel(code: string) {
    if (!confirm(`ยืนยันยกเลิกคิว ${code}?`)) return;
    const { data, error } = await supabase.rpc("cancel_my_booking", { p_code: code, p_phone: phone.replace(/\D/g, "") });
    if (error || !data) setMsg(error?.message ?? "ไม่สามารถยกเลิกคิวนี้ได้");
    else { setMsg(`ยกเลิกคิว ${code} แล้ว`); search(phone); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); search(phone); }} className="card flex gap-2">
        <input className="input" inputMode="tel" placeholder="กรอกเบอร์โทรที่ใช้จอง" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="btn shrink-0" disabled={loading}>{loading ? "..." : "ค้นหา"}</button>
      </form>

      {msg && <p className="rounded-lg bg-amber-50 p-3 text-sm">{msg}</p>}
      {rows && rows.length === 0 && <p className="text-center text-stone-500">ไม่พบการจอง</p>}

      {rows?.map((r) => {
        const canCancel = ["pending", "confirmed"].includes(r.status) && r.booking_date >= todayBkk();
        return (
          <div key={r.booking_code} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-sm text-stone-500">#{r.booking_code}</div>
                <div className="font-medium">{r.service_name}</div>
                <div className="text-sm text-stone-600">น้อง{r.pet_name} · {baht(r.price)}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm">📅 {thaiDate(r.booking_date)} · {hhmm(r.start_time)}–{hhmm(r.end_time)} น.</div>
              {canCancel && <button onClick={() => cancel(r.booking_code)} className="text-sm text-red-600 hover:underline">ยกเลิกคิว</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
