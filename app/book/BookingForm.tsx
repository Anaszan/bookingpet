"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Pet, PetType, Profile, Service, ShopSettings } from "@/lib/types";
import { availableSlots, baht, nowMinBkk, PET_EMOJI, PET_LABEL, thaiDate, todayBkk } from "@/lib/utils";

type Busy = { start_time: string; end_time: string };

export default function BookingForm({
  services, settings, pets: initialPets, profile, initialServiceId,
}: {
  services: Service[]; settings: ShopSettings; pets: Pet[]; profile: Profile; initialServiceId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [pets, setPets] = useState(initialPets);
  const [petId, setPetId] = useState<string>(() => {
    const svc = services.find((s) => s.id === initialServiceId);
    const match = initialPets.find((p) => !svc || svc.pet_type === "all" || svc.pet_type === p.pet_type);
    return match?.id ?? "new";
  });
  const [newPet, setNewPet] = useState({ name: "", pet_type: "dog" as PetType, breed: "", weight: "" });
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState<Busy[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [contact, setContact] = useState({ name: profile.full_name, phone: profile.phone ?? "" });
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const petType: PetType = petId === "new" ? newPet.pet_type : pets.find((p) => p.id === petId)?.pet_type ?? "dog";
  const filtered = services.filter((s) => s.pet_type === "all" || s.pet_type === petType);
  const service = filtered.find((s) => s.id === serviceId);

  const dates = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i <= settings.max_days_ahead; i++) {
      const d = todayBkk(i);
      if (!settings.closed_weekdays.includes(new Date(d + "T00:00:00").getDay())) list.push(d);
    }
    return list;
  }, [settings]);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const phone = contact.phone.replace(/\D/g, "");
    if (!service || !date || !time) return setError("กรุณาเลือกบริการ วัน และเวลา");
    if (!/^0\d{8,9}$/.test(phone)) return setError("เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)");
    if (petId === "new" && !newPet.name.trim()) return setError("กรุณากรอกชื่อสัตว์เลี้ยง");

    setSubmitting(true);
    let pid = petId;

    // 1) บันทึกสัตว์เลี้ยงใหม่
    if (petId === "new") {
      const { data, error } = await supabase.from("pets").insert({
        owner_id: profile.id, name: newPet.name.trim(), pet_type: newPet.pet_type,
        breed: newPet.breed.trim() || null, weight: newPet.weight ? Number(newPet.weight) : null,
      }).select().single();
      if (error || !data) { setSubmitting(false); return setError(error?.message ?? "บันทึกสัตว์เลี้ยงไม่สำเร็จ"); }
      setPets([...pets, data as Pet]);
      setPetId(data.id);
      pid = data.id;
    }

    // 2) อัปเดตข้อมูลติดต่อในโปรไฟล์ถ้ามีการเปลี่ยน
    if (contact.name.trim() !== profile.full_name || phone !== profile.phone) {
      await supabase.from("profiles").update({ full_name: contact.name.trim(), phone }).eq("id", profile.id);
    }

    // 3) จองคิว
    const { data, error } = await supabase.rpc("create_booking", {
      p_service_id: service.id, p_date: date, p_start: time, p_pet_id: pid,
      p_customer_name: contact.name, p_phone: phone, p_note: note || null,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      const r = await supabase.rpc("get_busy_slots", { p_date: date });
      setBusy((r.data as Busy[]) ?? []);
      setTime("");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    router.push(`/book/success?code=${row.booking_code}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* 1. สัตว์เลี้ยง */}
      <section className="card space-y-4">
        <h2 className="font-semibold">1. เลือกสัตว์เลี้ยง</h2>
        <div className="flex flex-wrap gap-2">
          {pets.map((p) => (
            <button key={p.id} type="button" onClick={() => setPetId(p.id)}
              className={`rounded-xl border px-4 py-2 text-sm ${petId === p.id ? "border-brand-500 bg-brand-50" : "border-stone-200"}`}>
              {PET_EMOJI[p.pet_type]} {p.name}
              {p.breed && <span className="text-stone-500"> · {p.breed}</span>}
            </button>
          ))}
          <button type="button" onClick={() => setPetId("new")}
            className={`rounded-xl border border-dashed px-4 py-2 text-sm ${petId === "new" ? "border-brand-500 bg-brand-50" : "border-stone-300"}`}>
            + เพิ่มสัตว์เลี้ยง
          </button>
        </div>
        {petId === "new" && (
          <div className="grid gap-3 rounded-xl bg-stone-50 p-4 sm:grid-cols-2">
            <div><label className="label">ชื่อ *</label><input className="input" value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })} /></div>
            <div>
              <label className="label">ประเภท</label>
              <select className="input" value={newPet.pet_type} onChange={(e) => setNewPet({ ...newPet, pet_type: e.target.value as PetType })}>
                {(["dog", "cat", "other"] as PetType[]).map((t) => <option key={t} value={t}>{PET_LABEL[t]}</option>)}
              </select>
            </div>
            <div><label className="label">สายพันธุ์</label><input className="input" value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })} /></div>
            <div><label className="label">น้ำหนัก (กก.)</label><input className="input" type="number" step="0.1" min="0" value={newPet.weight} onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })} /></div>
          </div>
        )}
      </section>

      {/* 2. บริการ */}
      <section className="card space-y-3">
        <h2 className="font-semibold">2. เลือกบริการ <span className="text-sm font-normal text-stone-500">สำหรับ{PET_LABEL[petType]}</span></h2>
        {filtered.length === 0 && <p className="text-sm text-stone-500">ไม่มีบริการสำหรับสัตว์ประเภทนี้</p>}
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
      </section>

      {/* 3. วันเวลา */}
      <section className="card space-y-4">
        <h2 className="font-semibold">3. เลือกวันและเวลา</h2>
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

      {/* 4. ข้อมูลติดต่อ */}
      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">4. ข้อมูลติดต่อ</h2>
        <div><label className="label">ชื่อผู้จอง *</label><input className="input" required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></div>
        <div><label className="label">เบอร์โทร *</label><input className="input" required inputMode="tel" placeholder="0812345678" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">หมายเหตุ</label><textarea className="input" rows={2} placeholder="เช่น แพ้แชมพู, ดุ, ทรงที่ต้องการ" value={note} onChange={(e) => setNote(e.target.value)} /></div>
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
