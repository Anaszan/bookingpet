import Link from "next/link";
import { requireRole } from "@/lib/supabase/server";
import type { Pet, PetType } from "@/lib/types";
import { PET_EMOJI, PET_LABEL } from "@/lib/utils";
import { deletePet, savePet } from "../actions";

export default async function MyPets({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const { supabase, user } = await requireRole(["customer", "staff", "owner"], "/account/pets");
  const { data } = await supabase.from("pets").select("*").eq("owner_id", user.id).order("created_at");
  const pets = (data ?? []) as Pet[];
  const editing = pets.find((p) => p.id === edit);
  const showForm = edit === "new" || !!editing;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">สัตว์เลี้ยงของฉัน</h1>
        {!showForm && <Link href="/account/pets?edit=new" className="btn">+ เพิ่ม</Link>}
      </div>

      {showForm && (
        <form action={savePet} className="card grid gap-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">{editing ? `แก้ไขข้อมูล${editing.name}` : "เพิ่มสัตว์เลี้ยง"}</h2>
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div><label className="label">ชื่อ *</label><input name="name" required defaultValue={editing?.name} className="input" /></div>
          <div>
            <label className="label">ประเภท</label>
            <select name="pet_type" defaultValue={editing?.pet_type ?? "dog"} className="input">
              {(["dog", "cat", "other"] as PetType[]).map((t) => <option key={t} value={t}>{PET_LABEL[t]}</option>)}
            </select>
          </div>
          <div><label className="label">สายพันธุ์</label><input name="breed" defaultValue={editing?.breed ?? ""} className="input" /></div>
          <div><label className="label">น้ำหนัก (กก.)</label><input name="weight" type="number" step="0.1" min="0" defaultValue={editing?.weight ?? ""} className="input" /></div>
          <div className="sm:col-span-2">
            <label className="label">ข้อมูลสำคัญสำหรับช่าง</label>
            <input name="note" defaultValue={editing?.note ?? ""} placeholder="เช่น แพ้แชมพูบางชนิด, กลัวไดร์, กัด" className="input" />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Link href="/account/pets" className="btn-outline">ยกเลิก</Link>
            <button className="btn">บันทึก</button>
          </div>
        </form>
      )}

      {pets.length === 0 && !showForm && (
        <p className="card text-center text-stone-500">ยังไม่มีข้อมูลสัตว์เลี้ยง</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {pets.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-medium">{PET_EMOJI[p.pet_type]} {p.name}</div>
                <div className="text-sm text-stone-500">
                  {PET_LABEL[p.pet_type]}{p.breed && ` · ${p.breed}`}{p.weight && ` · ${p.weight} กก.`}
                </div>
                {p.note && <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-sm text-amber-900">📝 {p.note}</div>}
              </div>
            </div>
            <div className="mt-3 flex gap-3 text-sm">
              <Link href={`/account/pets?edit=${p.id}`} className="text-sky-700 hover:underline">แก้ไข</Link>
              <form action={deletePet.bind(null, p.id)}>
                <button className="text-red-600 hover:underline">ลบ</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
