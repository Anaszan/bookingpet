import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAdmin();
  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-800 px-4 py-3 text-sm text-white">
        <div className="flex gap-4">
          <Link href="/admin" className="hover:text-brand-100">📋 คิวจอง</Link>
          <Link href="/admin/services" className="hover:text-brand-100">✂️ บริการ</Link>
          <Link href="/admin/settings" className="hover:text-brand-100">⚙️ ตั้งค่าร้าน</Link>
        </div>
        <form action={signOut} className="flex items-center gap-3">
          <span className="text-stone-400">{user.email}</span>
          <button className="rounded bg-stone-700 px-3 py-1 hover:bg-stone-600">ออกจากระบบ</button>
        </form>
      </div>
      {children}
    </div>
  );
}
