import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { ROLE_COLOR, ROLE_LABEL } from "@/lib/utils";
import { signOut } from "./auth/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "จองคิวอาบน้ำตัดขนสัตว์เลี้ยง",
  description: "ระบบจองคิวออนไลน์ ร้านอาบน้ำ ตัดขน สปา สำหรับสุนัขและแมว",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  const role = profile?.role;

  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-brand-700">🐾 Happy Paws</Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Link href="/book" className="hover:text-brand-600">จองคิว</Link>
              <Link href="/calendar" className="hover:text-brand-600">ปฏิทิน</Link>
              {profile && (
                <>
                  <Link href="/account" className="hover:text-brand-600">คิวของฉัน</Link>
                  <Link href="/account/pets" className="hover:text-brand-600">สัตว์เลี้ยง</Link>
                </>
              )}
              {(role === "staff" || role === "owner") && (
                <Link href="/staff" className="font-medium text-sky-700 hover:text-sky-900">คิวร้าน</Link>
              )}
              {role === "owner" && (
                <Link href="/owner" className="font-medium text-brand-700 hover:text-brand-600">จัดการร้าน</Link>
              )}
              {profile ? (
                <form action={signOut} className="flex items-center gap-2 border-l border-stone-200 pl-4">
                  <Link href="/account/profile" className="hover:text-brand-600">{profile.full_name || profile.email}</Link>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${ROLE_COLOR[profile.role]}`}>{ROLE_LABEL[profile.role]}</span>
                  <button className="text-stone-400 hover:text-red-600">ออก</button>
                </form>
              ) : (
                <>
                  <Link href="/login" className="hover:text-brand-600">เข้าสู่ระบบ</Link>
                  <Link href="/register" className="btn px-3 py-1.5 text-sm">สมัครสมาชิก</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
