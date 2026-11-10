"use client";
import { useTransition } from "react";
import type { BookingStatus } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import { updateBookingStatus } from "../actions";

export default function StatusSelect({ id, status }: { id: string; status: BookingStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => start(() => updateBookingStatus(id, e.target.value as BookingStatus))}
      className={`h-fit rounded-full border-0 px-3 py-1.5 text-sm font-medium ${STATUS_COLOR[status]} ${pending ? "opacity-50" : ""}`}
    >
      {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}
