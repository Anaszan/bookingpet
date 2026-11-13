import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import type { BookingStatus, CalendarEvent, EventType, ShopSettings } from "@/lib/types";
import {
  EVENT_COLOR, EVENT_DOT, EVENT_LABEL, hhmm, PET_EMOJI, STATUS_COLOR, STATUS_LABEL, THAI_MONTHS, thaiDate, todayBkk,
} from "@/lib/utils";
import { deleteEvent, saveEvent } from "./actions";

const WEEK_HEAD = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type DayBooking = {
  id: string; start_time: string; end_time: string; status: BookingStatus;
  pet_name: string; pet_type: string; customer_name: string; user_id: string | null;
  services: { name: string } | null;
};
const TYPES = Object.keys(EVENT_LABEL) as EventType[];

export default async function CalendarPage({
  searchParams,
}: { searchParams: Promise<{ month?: string; date?: string; edit?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  const canEdit = profile?.role === "staff" || profile?.role === "owner";

  const today = todayBkk();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const leading = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : null;

  const [{ data: evData }, { data: loads }, { data: settings }, { data: busyData }, { data: detailData }] = await Promise.all([
    supabase.from("calendar_events").select("*")
      .lte("start_date", last).gte("end_date", first).order("start_date"),
    supabase.rpc("get_day_loads", { p_from: first, p_to: last }),
    supabase.from("shop_settings").select("closed_weekdays, staff_count, open_time, close_time").single(),
    // ช่วงเวลาที่มีคิวของวันที่เลือก (เห็นแค่เวลา ไม่เห็นข้อมูลลูกค้า)
    selected ? supabase.rpc("get_busy_slots", { p_date: selected }) : Promise.resolve({ data: null }),
    // รายละเอียดคิว: เฉพาะพนักงาน/เจ้าของร้าน
    selected && canEdit
      ? supabase.from("bookings")
          .select("id, start_time, end_time, status, pet_name, pet_type, customer_name, user_id, services(name)")
          .eq("booking_date", selected).neq("status", "cancelled").order("start_time")
      : Promise.resolve({ data: null }),
  ]);
  const busy = ((busyData ?? []) as { start_time: string; end_time: string }[])
    .slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
  const details = (detailData ?? []) as unknown as DayBooking[];
  const events = (evData ?? []) as CalendarEvent[];
  const loadMap = new Map(((loads ?? []) as { booking_date: string; bookings: number }[]).map((l) => [l.booking_date, l.bookings]));
  // ช่วงเวลาที่จองแล้วของทุกวันที่มีคิวในเดือนนี้ (แสดงในช่องปฏิทิน)
  const busyDays = [...loadMap.keys()];
  const busyResults = await Promise.all(busyDays.map((d) => supabase.rpc("get_busy_slots", { p_date: d })));
  type Range = { start_time: string; end_time: string };
  const monthBusy = new Map<string, Range[]>(
    busyDays.map((d, i) => [
      d,
      ((busyResults[i].data ?? []) as Range[]).slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    ])
  );
  const s = settings as Pick<ShopSettings, "closed_weekdays" | "staff_count" | "open_time" | "close_time"> | null;
  const closedWeekdays = s?.closed_weekdays ?? [];

  const eventsOn = (d: string) => events.filter((e) => e.start_date <= d && e.end_date >= d);
  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);

  const dayEvents = selected ? eventsOn(selected) : [];
  const editing = sp.edit ? events.find((e) => e.id === sp.edit) : undefined;
  const href = (q: Record<string, string>) => `/calendar?${new URLSearchParams({ month, ...q })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ปฏิทินร้าน</h1>
          <p className="text-sm text-stone-500">วันหยุด กิจกรรม และโปรโมชันของร้าน</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?month=${prev}`} className="btn-outline" aria-label="เดือนก่อน">‹</Link>
          <Link href="/calendar" className="btn-outline">วันนี้</Link>
          <Link href={`/calendar?month=${next}`} className="btn-outline" aria-label="เดือนถัดไป">›</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ---------- ตารางปฏิทิน ---------- */}
        <section className="card p-3 sm:p-4">
          <h2 className="mb-3 text-center text-lg font-semibold">{THAI_MONTHS[m - 1]} {y + 543}</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-500">
            {WEEK_HEAD.map((d, i) => <div key={d} className={`py-1 ${i === 0 ? "text-red-500" : ""}`}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const evs = eventsOn(d);
              const holiday = evs.some((e) => e.event_type === "holiday");
              const weeklyOff = closedWeekdays.includes(new Date(d + "T00:00:00Z").getUTCDay());
              const closed = holiday || weeklyOff;
              const booked = monthBusy.get(d) ?? [];
              const isToday = d === today;
              const isSel = d === selected;
              return (
                <Link key={d} href={href({ date: d })}
                  className={`flex min-h-16 flex-col rounded-lg border p-1 text-left transition sm:min-h-24 sm:p-1.5
                    ${isSel ? "border-brand-500 ring-2 ring-brand-100" : "border-stone-100 hover:border-brand-300"}
                    ${closed ? "bg-stone-50" : "bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm
                      ${isToday ? "bg-brand-600 font-semibold text-white" : closed ? "text-stone-400" : ""}`}>
                      {Number(d.slice(8))}
                    </span>
                  </div>
                  {weeklyOff && !holiday && <span className="mt-0.5 text-[10px] text-stone-400">ปิดประจำ</span>}
                  {/* มือถือ: จุดสี / จอใหญ่: ป้ายชื่อ */}
                  <div className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                    {evs.map((e) => <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT[e.event_type]}`} />)}
                    {booked.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />}
                  </div>
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {evs.slice(0, 2).map((e) => (
                      <div key={e.id} className={`truncate rounded px-1 text-[11px] ${EVENT_COLOR[e.event_type]}`}>{e.title}</div>
                    ))}
                    {evs.length > 2 && <div className="text-[10px] text-stone-400">+{evs.length - 2} อื่น ๆ</div>}
                    {booked.slice(0, 3).map((b, j) => (
                      <div key={j} className="truncate rounded bg-stone-100 px-1 text-[10px] text-stone-600">
                        จองแล้ว {hhmm(b.start_time)}–{hhmm(b.end_time)}
                      </div>
                    ))}
                    {booked.length > 3 && <div className="text-[10px] text-stone-400">+{booked.length - 3} คิว</div>}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-600">
            {TYPES.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${EVENT_DOT[t]}`} />{EVENT_LABEL[t]}
              </span>
            ))}
          </div>
        </section>

        {/* ---------- รายละเอียดวัน / แก้ไข ---------- */}
        <aside className="space-y-4">
          {selected ? (
            <section className="card space-y-3">
              <h2 className="font-semibold">{thaiDate(selected)}</h2>
              {dayEvents.length === 0 && <p className="text-sm text-stone-500">ไม่มีรายการในวันนี้</p>}
              {dayEvents.map((e) => (
                <div key={e.id} className="rounded-xl border border-stone-100 p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${EVENT_COLOR[e.event_type]}`}>{EVENT_LABEL[e.event_type]}</span>
                  <div className="mt-1.5 font-medium">{e.title}</div>
                  {e.description && <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{e.description}</p>}
                  {e.start_date !== e.end_date && (
                    <p className="mt-1 text-xs text-stone-500">{thaiDate(e.start_date)} – {thaiDate(e.end_date)}</p>
                  )}
                  {canEdit && (
                    <div className="mt-2 flex gap-3 text-sm">
                      <Link href={href({ date: selected, edit: e.id })} className="text-sky-700 hover:underline">แก้ไข</Link>
                      <form action={deleteEvent.bind(null, e.id, selected)}>
                        <button className="text-red-600 hover:underline">ลบ</button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
              {(() => {
                const holiday = dayEvents.some((e) => e.event_type === "holiday");
                const weeklyOff = closedWeekdays.includes(new Date(selected + "T00:00:00Z").getUTCDay());
                if (holiday || weeklyOff) {
                  return <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-600">🚫 ร้านปิดในวันนี้</p>;
                }
                return (
                  <div className="space-y-3 border-t border-stone-100 pt-3">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold">คิวในวันนี้</h3>
                      {s && <span className="text-xs text-stone-500">เปิด {hhmm(s.open_time)}–{hhmm(s.close_time)} น.</span>}
                    </div>

                    {canEdit ? (
                      /* พนักงาน/เจ้าของร้าน: เห็นรายละเอียดทุกคิว */
                      details.length === 0 ? <p className="text-sm text-stone-500">ยังไม่มีคิว</p> : (
                        <ul className="space-y-2">
                          {details.map((b) => (
                            <li key={b.id} className="rounded-lg border border-stone-100 p-2 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">🕐 {hhmm(b.start_time)}–{hhmm(b.end_time)} น.</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_COLOR[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                              </div>
                              <div className="mt-0.5 text-stone-600">{b.services?.name}</div>
                              <div className="text-xs text-stone-500">{PET_EMOJI[b.pet_type]} {b.pet_name} · 👤 {b.customer_name}</div>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : (
                      /* ทุกคน: บอกแค่ช่วงเวลาที่จองแล้ว */
                      busy.length === 0 ? (
                        <p className="text-sm text-emerald-700">✅ ยังไม่มีการจอง</p>
                      ) : (
                        <ul className="space-y-1">
                          {busy.map((b, i) => (
                            <li key={i} className="rounded-md bg-stone-100 px-3 py-1.5 text-sm">
                              จองแล้ว {hhmm(b.start_time)}–{hhmm(b.end_time)} น.
                            </li>
                          ))}
                        </ul>
                      )
                    )}

                    {canEdit && (
                      <Link href={`/staff?date=${selected}`} className="btn-outline w-full text-sm">เปิดในหน้าคิวร้าน</Link>
                    )}
                    {selected >= today && (
                      <Link href="/book" className="btn w-full text-sm">จองคิวในวันนี้</Link>
                    )}
                  </div>
                );
              })()}
            </section>
          ) : (
            <section className="card text-sm text-stone-500">กดเลือกวันในปฏิทินเพื่อดูรายละเอียด</section>
          )}

          {canEdit && (
            <form key={editing?.id ?? selected ?? "new"} action={saveEvent} className="card space-y-3 border-sky-200">
              <h2 className="font-semibold">{editing ? "แก้ไขรายการ" : "+ เพิ่มรายการในปฏิทิน"}</h2>
              <input type="hidden" name="id" value={editing?.id ?? ""} />
              <div>
                <label className="label">ประเภท</label>
                <select name="event_type" defaultValue={editing?.event_type ?? "event"} className="input">
                  {TYPES.map((t) => <option key={t} value={t}>{EVENT_LABEL[t]}</option>)}
                </select>
              </div>
              <div><label className="label">หัวข้อ *</label><input name="title" required defaultValue={editing?.title} className="input" placeholder="เช่น หยุดวันสงกรานต์" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">ตั้งแต่</label><input type="date" name="start_date" required defaultValue={editing?.start_date ?? selected ?? today} className="input px-2" /></div>
                <div><label className="label">ถึง</label><input type="date" name="end_date" defaultValue={editing?.end_date ?? selected ?? today} className="input px-2" /></div>
              </div>
              <div><label className="label">รายละเอียด</label><textarea name="description" rows={3} defaultValue={editing?.description ?? ""} className="input" /></div>
              <p className="text-xs text-stone-500">* &quot;วันหยุดร้าน&quot; จะปิดรับจองคิวในวันนั้นอัตโนมัติ</p>
              <div className="flex gap-2">
                {editing && <Link href={href({ date: selected ?? editing.start_date })} className="btn-outline flex-1">ยกเลิก</Link>}
                <button className="btn flex-1">บันทึก</button>
              </div>
            </form>
          )}

          {/* รายการทั้งเดือน */}
          <section className="card space-y-2">
            <h2 className="font-semibold">รายการเดือนนี้</h2>
            {events.length === 0 && <p className="text-sm text-stone-500">ยังไม่มีรายการ</p>}
            {events.map((e) => (
              <Link key={e.id} href={href({ date: e.start_date < first ? first : e.start_date })}
                className="flex items-start gap-2 rounded-lg p-1.5 text-sm hover:bg-stone-50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EVENT_DOT[e.event_type]}`} />
                <span>
                  <span className="font-medium">{e.title}</span>
                  <span className="block text-xs text-stone-500">
                    {Number(e.start_date.slice(8))}{e.end_date !== e.start_date && `–${e.end_date.slice(0, 7) === e.start_date.slice(0, 7) ? Number(e.end_date.slice(8)) : thaiDate(e.end_date)}`} {THAI_MONTHS[Number(e.start_date.slice(5, 7)) - 1]}
                  </span>
                </span>
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
