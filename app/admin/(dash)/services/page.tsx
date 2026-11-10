import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";
import { baht, PET_LABEL } from "@/lib/utils";
import { saveService, toggleService } from "../../actions";

export default async function AdminServices({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").order("sort_order");
  const services = (data ?? []) as Service[];
  const editing = edit === "new" ? null : services.find((s) => s.id === edit);
  const showForm = edit === "new" || !!editing;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">บริการ</h1>
        <Link href="/admin/services?edit=new" className="btn">+ เพิ่มบริการ</Link>
      </div>

      {showForm && (
        <form action={saveService} className="card grid gap-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">{editing ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}</h2>
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div className="sm:col-span-2"><label className="label">ชื่อบริการ</label><input name="name" required defaultValue={editing?.name} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">รายละเอียด</label><input name="description" defaultValue={editing?.description ?? ""} className="input" /></div>
          <div><label className="label">ราคา (บาท)</label><input name="price" type="number" min="0" required defaultValue={editing?.price} className="input" /></div>
          <div><label className="label">ระยะเวลา (นาที)</label><input name="duration_minutes" type="number" min="15" step="15" required defaultValue={editing?.duration_minutes ?? 60} className="input" /></div>
          <div>
            <label className="label">สำหรับ</label>
            <select name="pet_type" defaultValue={editing?.pet_type ?? "all"} className="input">
              <option value="all">ทุกชนิด</option><option value="dog">สุนัข</option><option value="cat">แมว</option>
            </select>
          </div>
          <div><label className="label">ลำดับการแสดง</label><input name="sort_order" type="number" defaultValue={editing?.sort_order ?? services.length + 1} className="input" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} className="accent-brand-600" /> เปิดให้จอง</label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Link href="/admin/services" className="btn-outline">ยกเลิก</Link>
            <button className="btn">บันทึก</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr><th className="p-3">บริการ</th><th className="p-3">สำหรับ</th><th className="p-3">ราคา</th><th className="p-3">เวลา</th><th className="p-3">สถานะ</th><th></th></tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-t border-stone-100">
                <td className="p-3"><div className="font-medium">{s.name}</div><div className="text-xs text-stone-500">{s.description}</div></td>
                <td className="p-3">{PET_LABEL[s.pet_type]}</td>
                <td className="p-3">{baht(s.price)}</td>
                <td className="p-3">{s.duration_minutes} น.</td>
                <td className="p-3">
                  <form action={toggleService.bind(null, s.id, !s.is_active)}>
                    <button className={`rounded-full px-2.5 py-1 text-xs ${s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"}`}>
                      {s.is_active ? "เปิด" : "ปิด"}
                    </button>
                  </form>
                </td>
                <td className="p-3 text-right"><Link href={`/admin/services?edit=${s.id}`} className="text-sky-700 hover:underline">แก้ไข</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
