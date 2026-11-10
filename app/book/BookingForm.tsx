"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PetType, Service, ShopSettings } from "@/lib/types";
import { availableSlots, baht, nowMinBkk, PET_LABEL, thaiDate, todayBkk } from "@/lib/utils";

type Busy = { start_time: string; end_time: string };

export default function BookingForm({
  services, settings, initialServiceId,
}: { services: Service[]; settings: ShopSettings; initialServiceId?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [petType, setPetType] = useState<PetType>(() => {
    const s = services.find((x) => x.id === initialServiceId);
    return s?.pet_type === "cat" ? "cat" : "dog";
  });
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState<Busy[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ customer_name: "", phone: "", pet_name: "", pet_breed: "", pet_weight: "", note: "" });

  const filtered = services.filter((s) => s.pet_type === "all" || s.pet_type === petType);
  const service = services.find((s) => s.id === serviceId);

  // วันที่เปิดรับจอง
  const dates = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i <= settings.max_days_ahead; i++) {
      const d = todayBkk(i);
      if (!settings.closed_weekdays.includes(new Date(d + "T00:00:00").getDay())) list.push(d);
    }
    return list;
  }, [settings]);

  // โหลดช่วงเวลาที่ไม่ว่างเมื่อเปลี่ยนวัน
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoadingSlots(true);
    setTime("");
    supabase.rpc("get_busy_slots", { p_date: date }).then(({ data, error }) => {
      if (cancelled) return;
      setLoadingSlots(false);
      if (error) setError(error.message);
      setBusy((data as Busy[]) ?? []);
    });
    return () => { cancelled = true; };
  }, [date, supabase]);

  const slots = useMemo(() => {
    if (!service || !busy || !date) return [];
    return availableSlots({
      open: settings.open_time, close: settings.close_time, step: settings.slot_minutes,
      staff: settings.staff_count, duration: service.duration_minutes, busy,
      minStart: date === todayBkk() ? nowMinBkk() : undefined,
    });
  }, [service, busy, date, settings]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const phone = form.phone.replace(/\D/g, "");
    if (!service || !date || !time) return setError("กรุณาเลือกบริการ วัน และเวลา");
    if (!/^0\d{8,9}$/.test(phone)) return setError("เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)");

    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_booking", {
      p_service_id: service.id, p_date: date, p_start: time,
      p_customer_name: form.customer_name, p_phone: phone,
      p_pet_name: form.pet_name, p_pet_type: petType,
      p_pet_breed: form.pet_breed || null,
      p_pet_weight: form.pet_weight ? Number(form.pet_weight) : null,
      p_note: form.note || null,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      // คิวอาจถูกจองไปแล้ว — โหลดใหม่
      const r = await supabase.rpc("get_busy_slots", { p_date: date });
      setBusy((r.data as Busy[]) ?? []);
      setTime("");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    router.push(`/book/success?code=${row.booking_code}&phone=${phone}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* 1. สัตว์เลี้ยง & บริการ */}
      <section className="card space-y-4">
        <h2 className="font-semibold">1. เลือกบริการ</h2>
        <div className="flex gap-2">
          {(["dog", "cat", "other"] as PetType[]).map((p) => (
            <button key={p} type="button"
              onClick={() => { setPetType(p); setServiceId(""); }}
              className={`rounded-full px-4 py-1.5 text-sm ${petType === p ? "bg-brand-600 text-white" : "bg-stone-100"}`}>
              {p === "dog" ? "🐶 " : p === "cat" ? "🐱 " : "🐰 "}{PET_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {filtered.map((s) => (
            <label key={s.id}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${serviceId === s.id ? "border-brand-500 bg-brand-50" : "border-stone-200"}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="service" checked={serviceId === s.id}
                  onChange={() => { setServiceId(s.id); setTime(""); }} className="accent-brand-600" />
                <span>
                  <span className="block">{s.name}</span>
                  <span className="text-xs text-stone-500">{s.duration_minutes} นาที</span>
                </span>
              </span>
              <span className="font-medium text-brand-700">{baht(s.price)}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 2. วันเวลา */}
      <section className="card space-y-4">
        <h2 className="font-semibold">2. เลือกวันและเวลา</h2>
        <select className="input" value={date} onChange={(e) => setDate(e.target.value)} disabled={!service}>
          <option value="">{service ? "-- เลือกวัน --" : "กรุณาเลือกบริการก่อน"}</option>
          {dates.map((d) => <option key={d} value={d}>{thaiDate(d)}</option>)}
        </select>
        {loadingSlots && <p className="text-sm text-stone-500">กำลังโหลดเวลาว่าง...</p>}
        {!loadingSlots && date && service && (
          slots.some((s) => s.free) ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((s) => (
                <button key={s.time} type="button" disabled={!s.free} onClick={() => setTime(s.time)}
                  className={`rounded-lg border py-2 text-sm ${time === s.time ? "border-brand-600 bg-brand-600 text-white"
                    : s.free ? "border-stone-300 hover:border-brand-500" : "border-stone-100 bg-stone-100 text-stone-300 line-through"}`}>
                  {s.time}
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-red-600">วันนี้คิวเต็มแล้ว กรุณาเลือกวันอื่น</p>
        )}
      </section>

      {/* 3. ข้อมูล */}
      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">3. ข้อมูลผู้จอง</h2>
        <div><label className="label">ชื่อผู้จอง *</label><input className="input" required value={form.customer_name} onChange={set("customer_name")} /></div>
        <div><label className="label">เบอร์โทร *</label><input className="input" required inputMode="tel" placeholder="0812345678" value={form.phone} onChange={set("phone")} /></div>
        <div><label className="label">ชื่อสัตว์เลี้ยง *</label><input className="input" required value={form.pet_name} onChange={set("pet_name")} /></div>
        <div><label className="label">สายพันธุ์</label><input className="input" value={form.pet_breed} onChange={set("pet_breed")} /></div>
        <div><label className="label">น้ำหนัก (กก.)</label><input className="input" type="number" step="0.1" min="0" value={form.pet_weight} onChange={set("pet_weight")} /></div>
        <div className="sm:col-span-2"><label className="label">หมายเหตุ</label><textarea className="input" rows={2} placeholder="เช่น แพ้แชมพู, ดุ, ทรงที่ต้องการ" value={form.note} onChange={set("note")} /></div>
      </section>

      {service && date && time && (
        <div className="rounded-xl bg-brand-50 p-4 text-sm">
          <b>{service.name}</b> · {thaiDate(date)} เวลา {time} น. · {baht(service.price)}
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button className="btn w-full py-3 text-lg" disabled={submitting || !time}>
        {submitting ? "กำลังจอง..." : "ยืนยันการจอง"}
      </button>
    </form>
  );
}
