import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { activateClassesForUser, getClasses, getUserEnrollments } from "@/lib/db";
import { isMidtransConfigured } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function eligibleBuyer(session: Awaited<ReturnType<typeof getServerSession>>) {
  return Boolean(session?.email && session.emailVerified === true && session.authUserId && ["peserta", "umum", "member"].includes(session.role));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  const accountEmail = session?.email?.trim().toLowerCase() || "";
  if (!session || !accountEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) return NextResponse.json({ error: "Email akun tidak tersedia. Silakan keluar lalu masuk kembali." }, { status: 401 });
  if (!eligibleBuyer(session)) return NextResponse.json({ error: "Verifikasi email akun Anda sebelum mengambil kelas." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "checkout");
  if (action === "free") {
    const classId = String(body.classId || "");
    try {
      const result = await activateClassesForUser({ classIds: [classId], userEmail: accountEmail, userName: session.name, source: "gratis" });
      return NextResponse.json({ ok: true, alreadyOwned: result.alreadyOwned.length > 0, redirectTo: "/kelas-saya" });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Kelas gratis belum dapat diambil." }, { status: 400 });
    }
  }

  const rawClassIds: unknown[] = Array.isArray(body.classIds) ? body.classIds : [];
  const classIds = [...new Set(rawClassIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))];
  if (!classIds.length || classIds.length > 50) return NextResponse.json({ error: "Pilih 1 sampai 50 kelas untuk melanjutkan." }, { status: 400 });
  const classes = await getClasses(false);
  const selected = classIds.map((id) => classes.find((item) => item.id === id));
  if (selected.some((item) => !item)) return NextResponse.json({ error: "Satu atau beberapa kelas sudah tidak tersedia." }, { status: 400 });
  if (selected.some((item) => Number(item?.priceIdr) <= 0)) return NextResponse.json({ error: "Kelas gratis tidak dapat dibeli. Ambil kelas langsung dari halaman kelas." }, { status: 400 });

  const mode = process.env.PAYMENT_ACTIVATION_MODE?.trim().toLowerCase() === "midtrans" ? "midtrans" : "instant";
  if (mode === "instant") {
    try {
      const result = await activateClassesForUser({ classIds, userEmail: accountEmail, userName: session.name, source: "beli" });
      return NextResponse.json({ ok: true, mode, activated: result.activated.length, alreadyOwned: result.alreadyOwned.length, redirectTo: "/kelas-saya" });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Pesanan belum dapat diselesaikan." }, { status: 400 });
    }
  }

  if (!isMidtransConfigured()) return NextResponse.json({ error: "Pembayaran belum siap. Hubungi admin atau coba lagi nanti." }, { status: 503 });
  try {
    const admin = createSupabaseAdminClient();
    const existingOrders = await admin.from("class_checkout_orders").select("order_id,class_ids,amount_idr,snap_token,redirect_url,status").eq("user_email", accountEmail).eq("status", "pending").order("created_at", { ascending: false }).limit(10);
    if (existingOrders.error) return NextResponse.json({ error: "Layanan checkout perlu disiapkan oleh admin sebelum digunakan." }, { status: 503 });
    const requestedKey = [...classIds].sort().join("|");
    const existing = (existingOrders.data || []).find((order) => Array.isArray(order.class_ids) && [...order.class_ids.map(String)].sort().join("|") === requestedKey);
    if (existing?.redirect_url) return NextResponse.json({ ok: true, mode, orderId: existing.order_id, redirectUrl: existing.redirect_url });

    const currentEnrollments = await getUserEnrollments(accountEmail);
    const alreadyOwned = new Set(currentEnrollments.map((entry) => entry.classId));
    if (classIds.some((id) => alreadyOwned.has(id))) return NextResponse.json({ error: "Ada kelas di keranjang yang sudah Anda miliki. Perbarui keranjang sebelum melanjutkan." }, { status: 409 });

    const orderId = `SAPEN-KLS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const amountIdr = selected.reduce((sum, item) => sum + Number(item?.priceIdr || 0), 0);
    const endpoint = process.env.MIDTRANS_IS_PRODUCTION === "true" ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";
    const basicAuth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Basic ${basicAuth}` },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amountIdr },
        customer_details: { first_name: session.name, email: session.email },
        item_details: selected.map((item) => ({ id: item!.id, price: item!.priceIdr, quantity: 1, name: item!.title.slice(0, 50) })),
      }),
    });
    const snap = await response.json().catch(() => ({}));
    if (!response.ok || !snap.token || !snap.redirect_url) return NextResponse.json({ error: "Tagihan belum dapat dibuat. Periksa metode pembayaran atau coba lagi." }, { status: 502 });

    const { error } = await admin.from("class_checkout_orders").insert({ order_id: orderId, class_ids: classIds, user_email: accountEmail, user_name: session.name, amount_idr: amountIdr, payment_method: String(body.paymentMethod || "QRIS"), snap_token: snap.token, redirect_url: snap.redirect_url, status: "pending" });
    if (error) return NextResponse.json({ error: "Pesanan belum tersimpan. Silakan coba sekali lagi." }, { status: 503 });
    return NextResponse.json({ ok: true, mode, orderId, redirectUrl: snap.redirect_url });
  } catch {
    return NextResponse.json({ error: "Checkout belum dapat diproses. Coba lagi beberapa saat." }, { status: 503 });
  }
}
