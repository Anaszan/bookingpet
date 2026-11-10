import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const { profile } = await getSession();
  if (profile) redirect(next ?? homeFor(profile.role));

  return (
    <div className="mx-auto mt-6 max-w-sm space-y-4">
      {sp.error === "confirm" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">ลิงก์ยืนยันอีเมลไม่ถูกต้องหรือหมดอายุ</p>
      )}
      <LoginForm next={next} />
      <p className="text-center text-sm text-stone-600">
        ยังไม่มีบัญชี?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand-700 hover:underline">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}
