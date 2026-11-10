"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [f, setF] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const phone = f.phone.replace(/\D/g, "");
    if (!/^0\d{8,9}$/.test(phone)) return setError("เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)");
    if (f.password.length < 6) return setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");

    setLoading(true);
    const dest = next ?? "/account";
    const { data, error } = await createClient().auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        data: { full_name: f.full_name.trim(), phone },
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
      },
    });
    setLoading(false);
    if (error) {
      return setError(error.message.includes("already registered") ? "อีเมลนี้สมัครไว้แล้ว" : error.message);
    }
    if (data.session) {
      router.replace(dest);
      router.refresh();
    } else {
      setSent(true); // โปรเจกต์เปิด "Confirm email" ไว้
    }
  }

  if (sent) {
    return (
      <div className="card text-center">
        <div className="text-4xl">📧</div>
        <h1 className="mt-2 text-xl font-semibold">ตรวจสอบอีเมลของคุณ</h1>
        <p className="mt-2 text-sm text-stone-600">เราส่งลิงก์ยืนยันไปที่ <b>{f.email}</b> แล้ว กดลิงก์เพื่อเปิดใช้งานบัญชี</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h1 className="text-xl font-semibold">สมัครสมาชิก</h1>
      <div><label className="label">ชื่อ-นามสกุล</label><input className="input" required value={f.full_name} onChange={set("full_name")} /></div>
      <div><label className="label">เบอร์โทร</label><input className="input" required inputMode="tel" placeholder="0812345678" value={f.phone} onChange={set("phone")} /></div>
      <div><label className="label">อีเมล</label><input className="input" type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></div>
      <div><label className="label">รหัสผ่าน</label><input className="input" type="password" required minLength={6} autoComplete="new-password" value={f.password} onChange={set("password")} /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full" disabled={loading}>{loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}</button>
    </form>
  );
}
