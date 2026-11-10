import Link from "next/link";
import { requireRole } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";
import { baht, todayBkk } from "@/lib/utils";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export default async function OwnerReport({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireRole(["owner"], "/owner");

  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : todayBkk().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  const [{ data }, { count: customerCount }] = await Promise.all([
    supabase.from("bookings")
      .select("*, services(name), staff:profiles!bookings_staff_id_fkey(full_name)")
      .gte("booking_date", from).lte("booking_date", to),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
  ]);
  const bookings = (data ?? []) as Booking[];
  const done = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const revenue = done.reduce((s, b) => s + Number(b.price), 0);
  const pipeline = bookings
    .filter((b) => ["pending", "confirmed", "in_progress"].includes(b.status))
    .reduce((s, b) => s + Number(b.price), 0);

  // รายได้รายวัน
  const daily = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { day: i + 1, total: done.filter((b) => b.booking_date === d).reduce((s, b) => s + Number(b.price), 0) };
  });
  const maxDaily = Math.max(1, ...daily.map((d) => d.total));

  const group = (key: (b: Booking) => string) => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const b of done) {
      const k = key(b);
      const v = map.get(k) ?? { count: 0, revenue: 0 };
      v.count++; v.revenue += Number(b.price);
      map.set(k, v);
    }
    return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
  };
  const byService = group((b) => b.services?.name ?? "-");
  const byStaff = group((b) => b.staff?.full_name || "ไม่ระบุช่าง");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">รายงาน {MONTHS[m - 1]} {y + 543}</h1>
        <div className="flex gap-2">
          <Link href={`/owner?month=${prev}`} className="btn-outline">‹</Link>
          <Link href="/owner" className="btn-outline">เดือนนี้</Link>
          <Link href={`/owner?month=${next}`} className="btn-outline">›</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="รายได้ (เสร็จสิ้น)" value={baht(revenue)} accent />
        <Stat label="รายได้ที่รอเข้า" value={baht(pipeline)} />
        <Stat label="คิวเสร็จสิ้น" value={done.length} />
        <Stat label="ยกเลิก" value={`${cancelled.length}${bookings.length ? ` (${Math.round((cancelled.length / bookings.length) * 100)}%)` : ""}`} />
        <Stat label="ลูกค้าทั้งหมด" value={customerCount ?? 0} />
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">รายได้รายวัน</h2>
        <div className="flex h-40 items-end gap-0.5">
          {daily.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="rounded-t bg-brand-500 transition group-hover:bg-brand-700"
                style={{ height: `${(d.total / maxDaily) * 100}%`, minHeight: d.total ? 2 : 0 }} />
              <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-2 py-0.5 text-xs text-white group-hover:block">
                {d.day} · {baht(d.total)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-stone-400"><span>1</span><span>{daysInMonth}</span></div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Table title="แยกตามบริการ" rows={byService} />
        <Table title="แยกตามช่าง" rows={byStaff} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent ? "text-brand-700" : ""}`}>{value}</div>
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: [string, { count: number; revenue: number }][] }) {
  return (
    <section className="card p-0">
      <h2 className="p-4 font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="px-4 pb-4 text-sm text-stone-500">ยังไม่มีข้อมูล</p> : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([name, v]) => (
              <tr key={name} className="border-t border-stone-100">
                <td className="px-4 py-2">{name}</td>
                <td className="px-4 py-2 text-right text-stone-500">{v.count} คิว</td>
                <td className="px-4 py-2 text-right font-medium">{baht(v.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
