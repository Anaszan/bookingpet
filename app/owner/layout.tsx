import Link from "next/link";
import { requireRole } from "@/lib/supabase/server";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner"], "/owner");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-stone-800 px-4 py-3 text-sm text-white">
        <Link href="/owner" className="hover:text-brand-100">📊 รายงาน</Link>
        <Link href="/staff" className="hover:text-brand-100">📋 คิวร้าน</Link>
        <Link href="/owner/services" className="hover:text-brand-100">✂️ บริการ</Link>
        <Link href="/owner/team" className="hover:text-brand-100">👥 ผู้ใช้และพนักงาน</Link>
        <Link href="/owner/settings" className="hover:text-brand-100">⚙️ ตั้งค่าร้าน</Link>
      </div>
      {children}
    </div>
  );
}
