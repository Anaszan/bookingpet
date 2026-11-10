"use client";
import { useTransition } from "react";
import type { Role } from "@/lib/types";
import { ROLE_COLOR, ROLE_LABEL } from "@/lib/utils";
import { setRole } from "../actions";

export default function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, start] = useTransition();
  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Role;
        if (next === "owner" && !confirm("ให้สิทธิ์เจ้าของร้าน? ผู้ใช้นี้จะจัดการร้านได้ทั้งหมด")) return;
        start(() => setRole(userId, next));
      }}
      className={`rounded-full border-0 px-3 py-1 text-xs font-medium ${ROLE_COLOR[role]} ${pending ? "opacity-50" : ""}`}
    >
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
    </select>
  );
}
