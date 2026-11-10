import Link from "next/link";
import { requireRole } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/utils";
import RoleSelect from "./RoleSelect";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireRole(["owner"], "/owner/team");

  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (sp.role) query = query.eq("role", sp.role);
  if (sp.q) {
    const q = sp.q.replace(/[%,()]/g, "");
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data } = await query;
  const people = (data ?? []) as Profile[];

  const tabs: [string, string][] = [["", "ทั้งหมด"], ["owner", "เจ้าของร้าน"], ["staff", "พนักงาน"], ["customer", "ลูกค้า"]];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">ผู้ใช้และพนักงาน</h1>
        <p className="text-sm text-stone-500">
          ให้พนักงานสมัครสมาชิกที่หน้าเว็บก่อน แล้วเปลี่ยนสิทธิ์เป็น &quot;พนักงาน&quot; ที่นี่
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map(([r, label]) => (
          <Link key={r} href={`/owner/team${r ? `?role=${r}` : ""}`}
            className={`rounded-full px-3 py-1 ${(sp.role ?? "") === r ? "bg-stone-800 text-white" : "bg-stone-100"}`}>
            {label}
          </Link>
        ))}
      </div>

      <form className="card flex gap-2">
        {sp.role && <input type="hidden" name="role" value={sp.role} />}
        <input name="q" defaultValue={sp.q} placeholder="ค้นหา ชื่อ / อีเมล / เบอร์" className="input" />
        <button className="btn shrink-0">ค้นหา</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr><th className="p-3">ชื่อ</th><th className="p-3">อีเมล</th><th className="p-3">เบอร์โทร</th><th className="p-3">สิทธิ์</th></tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="p-3 font-medium">{p.full_name || "-"}{p.id === user.id && <span className="ml-1 text-xs text-stone-400">(คุณ)</span>}</td>
                <td className="p-3 text-stone-600">{p.email}</td>
                <td className="p-3">{p.phone ?? "-"}</td>
                <td className="p-3">
                  {p.id === user.id
                    ? <span className="text-stone-500">{ROLE_LABEL[p.role as Role]}</span>
                    : <RoleSelect userId={p.id} role={p.role} />}
                </td>
              </tr>
            ))}
            {people.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-stone-500">ไม่พบผู้ใช้</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
