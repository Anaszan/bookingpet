import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

/** คืน user ถ้าเป็นแอดมิน ไม่งั้นคืน null */
export async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { supabase, user: isAdmin ? user : null };
}
