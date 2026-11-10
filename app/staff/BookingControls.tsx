"use client";
import { useTransition } from "react";
import type { BookingStatus } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import { assignStaff, updateBookingStatus } from "./actions";

export function StatusSelect({ id, status }: { id: string; status: BookingStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => start(() => updateBookingStatus(id, e.target.value as BookingStatus))}
      className={`rounded-full border-0 px-3 py-1.5 text-sm font-medium ${STATUS_COLOR[status]} ${pending ? "opacity-50" : ""}`}
    >
      {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}

export function StaffSelect({
  id, staffId, team,
}: { id: string; staffId: string | null; team: { id: string; full_name: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <select
      value={staffId ?? ""}
      disabled={pending}
      onChange={(e) => start(() => assignStaff(id, e.target.value || null))}
      className={`rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm ${pending ? "opacity-50" : ""}`}
    >
      <option value="">— ยังไม่ระบุช่าง —</option>
      {team.map((t) => <option key={t.id} value={t.id}>✂️ {t.full_name || "(ไม่มีชื่อ)"}</option>)}
    </select>
  );
}
