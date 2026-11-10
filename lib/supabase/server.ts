import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Profile, Role } from "@/lib/types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // เรียกจาก Server Component ตั้ง cookie ไม่ได้ — proxy.ts จะรีเฟรช session ให้
          }
        },
      },
    }
  );
}

/** ผู้ใช้ปัจจุบัน + โปรไฟล์ (cache ต่อ 1 request) */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { supabase, user, profile: profile as Profile | null };
});

/** บังคับให้ล็อกอินและมีสิทธิ์ตามที่กำหนด ไม่งั้น redirect */
export async function requireRole(roles: Role[], next?: string) {
  const s = await getSession();
  if (!s.user || !s.profile) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  if (!roles.includes(s.profile.role)) redirect("/");
  return s as { supabase: typeof s.supabase; user: User; profile: Profile };
}

/** หน้าแรกของแต่ละบทบาทหลังล็อกอิน */
export const homeFor = (role: Role) => (role === "customer" ? "/account" : "/staff");
