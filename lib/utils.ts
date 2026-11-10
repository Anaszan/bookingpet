import type { BookingStatus, Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = { customer: "ลูกค้า", staff: "พนักงาน", owner: "เจ้าของร้าน" };
export const ROLE_COLOR: Record<Role, string> = {
  customer: "bg-stone-100 text-stone-700",
  staff: "bg-sky-100 text-sky-800",
  owner: "bg-brand-100 text-brand-700",
};
export const PET_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", other: "🐰" };

/** ป้องกัน open redirect: รับเฉพาะ path ภายในเว็บ */
export const safeNext = (n?: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  in_progress: "กำลังให้บริการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  in_progress: "bg-violet-100 text-violet-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-200 text-stone-600",
};

export const PET_LABEL: Record<string, string> = { dog: "สุนัข", cat: "แมว", other: "อื่น ๆ", all: "ทุกชนิด" };
export const WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** "09:30:00" -> 570 */
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
/** 570 -> "09:30" */
export const toTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const hhmm = (t: string) => t.slice(0, 5);

export const baht = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

export const thaiDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

/** วันนี้ในเขตเวลากรุงเทพ รูปแบบ YYYY-MM-DD */
export function todayBkk(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
}

export function nowMinBkk() {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
  return toMin(s);
}

/**
 * หาเวลาเริ่มที่ยังว่างสำหรับบริการที่ใช้เวลา duration นาที
 * (ตรรกะเดียวกับฟังก์ชัน create_booking ใน SQL)
 */
export function availableSlots(opts: {
  open: string; close: string; step: number; staff: number; duration: number;
  busy: { start_time: string; end_time: string }[]; minStart?: number;
}) {
  const busy = opts.busy.map((b) => [toMin(b.start_time), toMin(b.end_time)] as const);
  const open = toMin(opts.open), close = toMin(opts.close);
  const result: { time: string; free: boolean }[] = [];
  for (let s = open; s + opts.duration <= close; s += opts.step) {
    const e = s + opts.duration;
    const points = [s, ...busy.map(([bs]) => bs).filter((bs) => bs > s && bs < e)];
    const maxConcurrent = Math.max(0, ...points.map((t) => busy.filter(([bs, be]) => bs <= t && be > t).length));
    const free = maxConcurrent < opts.staff && (opts.minStart === undefined || s > opts.minStart);
    result.push({ time: toTime(s), free });
  }
  return result;
}
