"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CancelButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!confirm(`ยืนยันยกเลิกคิว ${code}?`)) return;
    setLoading(true);
    const { data, error } = await createClient().rpc("cancel_my_booking", { p_id: id });
    setLoading(false);
    if (error || !data) alert(error?.message ?? "ไม่สามารถยกเลิกคิวนี้ได้");
    router.refresh();
  }

  return (
    <button onClick={cancel} disabled={loading} className="text-sm text-red-600 hover:underline disabled:opacity-50">
      {loading ? "กำลังยกเลิก..." : "ยกเลิกคิว"}
    </button>
  );
}
