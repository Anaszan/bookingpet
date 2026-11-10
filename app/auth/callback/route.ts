import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

// ลิงก์ยืนยันอีเมลจาก Supabase จะส่งกลับมาที่นี่พร้อม ?code=
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next")) ?? "/account";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=confirm`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
