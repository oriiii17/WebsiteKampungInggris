import { NextResponse } from "next/server";

// Checkout stays paused until the payment flow is explicitly re-enabled.
// Never create accounts or enrollments from this endpoint while payments are held.
export async function POST() {
  return NextResponse.json(
    { error: "Checkout kelas sedang ditahan. Keranjang Anda tetap tersimpan; silakan hubungi admin untuk informasi pendaftaran." },
    { status: 503 }
  );
}
