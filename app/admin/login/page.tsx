"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); return setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง"); }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      return setError("บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลร้าน");
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-10 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">เข้าสู่ระบบร้านค้า</h1>
      <div><label className="label">อีเมล</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label">รหัสผ่าน</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full" disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
    </form>
  );
}
