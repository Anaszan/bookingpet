"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return setError(
        error?.message.includes("Email not confirmed")
          ? "กรุณายืนยันอีเมลก่อน (เช็คกล่องจดหมาย)"
          : "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
      );
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    const home = profile?.role === "staff" || profile?.role === "owner" ? "/staff" : "/account";
    router.replace(next ?? home);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
      <div><label className="label">อีเมล</label><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label">รหัสผ่าน</label><input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full" disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
    </form>
  );
}
