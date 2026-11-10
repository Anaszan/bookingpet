import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const { profile } = await getSession();
  if (profile) redirect(next ?? homeFor(profile.role));

  return (
    <div className="mx-auto mt-6 max-w-sm space-y-4">
      <RegisterForm next={next} />
      <p className="text-center text-sm text-stone-600">
        มีบัญชีแล้ว?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand-700 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
