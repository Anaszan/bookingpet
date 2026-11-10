import { requireRole } from "@/lib/supabase/server";
import { ROLE_COLOR, ROLE_LABEL } from "@/lib/utils";
import { updateProfile } from "../actions";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireRole(["customer", "staff", "owner"], "/account/profile");

  return (
    <form action={updateProfile} className="card mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ข้อมูลส่วนตัว</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs ${ROLE_COLOR[profile.role]}`}>{ROLE_LABEL[profile.role]}</span>
      </div>
      {sp.saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">บันทึกแล้ว</p>}
      {sp.error === "phone" && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">เบอร์โทรไม่ถูกต้อง</p>}
      <div><label className="label">อีเมล</label><input disabled value={profile.email ?? ""} className="input bg-stone-50 text-stone-500" /></div>
      <div><label className="label">ชื่อ-นามสกุล</label><input name="full_name" required defaultValue={profile.full_name} className="input" /></div>
      <div><label className="label">เบอร์โทร</label><input name="phone" inputMode="tel" defaultValue={profile.phone ?? ""} className="input" /></div>
      <button className="btn w-full">บันทึก</button>
    </form>
  );
}
