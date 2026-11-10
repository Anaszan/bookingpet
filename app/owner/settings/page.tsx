import { requireRole } from "@/lib/supabase/server";
import type { ShopSettings } from "@/lib/types";
import { hhmm, WEEKDAYS } from "@/lib/utils";
import { saveSettings } from "../actions";

export default async function OwnerSettings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { supabase } = await requireRole(["owner"], "/owner/settings");
  const { data } = await supabase.from("shop_settings").select("*").single();
  const s = data as ShopSettings;

  return (
    <form action={saveSettings} className="card mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
      <h1 className="text-2xl font-semibold sm:col-span-2">ตั้งค่าร้าน</h1>
      {saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 sm:col-span-2">บันทึกแล้ว</p>}
      <div><label className="label">ชื่อร้าน</label><input name="shop_name" defaultValue={s.shop_name} className="input" /></div>
      <div><label className="label">เบอร์โทรร้าน</label><input name="phone" defaultValue={s.phone ?? ""} className="input" /></div>
      <div><label className="label">เวลาเปิด</label><input type="time" name="open_time" defaultValue={hhmm(s.open_time)} className="input" /></div>
      <div><label className="label">เวลาปิด</label><input type="time" name="close_time" defaultValue={hhmm(s.close_time)} className="input" /></div>
      <div>
        <label className="label">ช่วงเวลาให้เลือก</label>
        <select name="slot_minutes" defaultValue={s.slot_minutes} className="input">
          <option value={15}>ทุก 15 นาที</option><option value={30}>ทุก 30 นาที</option><option value={60}>ทุก 1 ชั่วโมง</option>
        </select>
      </div>
      <div><label className="label">รับงานพร้อมกันได้ (จำนวนช่าง)</label><input type="number" min="1" name="staff_count" defaultValue={s.staff_count} className="input" /></div>
      <div><label className="label">เปิดให้จองล่วงหน้า (วัน)</label><input type="number" min="1" max="180" name="max_days_ahead" defaultValue={s.max_days_ahead} className="input" /></div>
      <div className="sm:col-span-2">
        <label className="label">วันหยุดประจำสัปดาห์</label>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((d, i) => (
            <label key={i} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="closed_weekdays" value={i} defaultChecked={s.closed_weekdays.includes(i)} className="accent-brand-600" /> {d}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end sm:col-span-2"><button className="btn">บันทึก</button></div>
    </form>
  );
}
