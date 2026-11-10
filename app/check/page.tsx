import CheckBooking from "./CheckBooking";

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">เช็คคิวของฉัน</h1>
      <CheckBooking initialPhone={phone ?? ""} />
    </div>
  );
}
