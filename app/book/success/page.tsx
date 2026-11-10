import Link from "next/link";

export default async function Success({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <div className="card mx-auto max-w-md text-center">
      <div className="text-5xl">🎉</div>
      <h1 className="mt-3 text-2xl font-semibold">จองคิวสำเร็จ!</h1>
      <p className="mt-2 text-stone-600">รหัสการจองของคุณคือ</p>
      <div className="my-3 font-mono text-4xl font-bold tracking-widest text-brand-700">{code}</div>
      <p className="text-sm text-stone-500">ร้านจะยืนยันคิวให้เร็ว ๆ นี้ ดูสถานะได้ที่หน้า &quot;คิวของฉัน&quot;</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/account" className="btn">ดูคิวของฉัน</Link>
        <Link href="/" className="btn-outline">หน้าแรก</Link>
      </div>
    </div>
  );
}
