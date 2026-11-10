import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "จองคิวอาบน้ำตัดขนสัตว์เลี้ยง",
  description: "ระบบจองคิวออนไลน์ ร้านอาบน้ำ ตัดขน สปา สำหรับสุนัขและแมว",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-brand-700">🐾 Happy Paws</Link>
            <div className="flex gap-4 text-sm">
              <Link href="/book" className="hover:text-brand-600">จองคิว</Link>
              <Link href="/check" className="hover:text-brand-600">เช็คคิว</Link>
              <Link href="/admin" className="text-stone-400 hover:text-brand-600">ร้านค้า</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
