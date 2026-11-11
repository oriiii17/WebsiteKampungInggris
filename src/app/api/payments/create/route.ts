import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getPlans, readLocalDb, writeLocalDb } from "@/lib/db";
import { isMidtransConfigured } from "@/lib/supabase";
import { SubscriptionRecord } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.email) {
      return NextResponse.json(
        { error: "Silakan daftar atau masuk dengan akun Email terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const planId = String(body.planId || "");
    const paymentMethod = String(body.paymentMethod || "QRIS");

    const plans = await getPlans();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Paket langganan tidak ditemukan." }, { status: 404 });
    }

    const orderId = `SAPEN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    let snapToken: string | undefined;
    let redirectUrl: string | undefined;

    // Jika kredensial Midtrans asli sudah diisi di .env.local, panggil Midtrans Snap API
    if (isMidtransConfigured()) {
      const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
      const endpoint = isProd
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const basicAuth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");
      const mtRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: plan.priceIdr,
          },
          customer_details: {
            first_name: session.name,
            email: session.email,
          },
          item_details: [
            {
              id: plan.id,
              price: plan.priceIdr,
              quantity: 1,
              name: plan.name,
            },
          ],
        }),
      });

      if (mtRes.ok) {
        const mtJson = await mtRes.json();
        snapToken = mtJson.token;
        redirectUrl = mtJson.redirect_url;
      }
    }

    const record: SubscriptionRecord = {
      id: `sub-${Date.now()}`,
      userEmail: session.email,
      userName: session.name,
      planId: plan.id,
      planName: plan.name,
      amountIdr: plan.priceIdr,
      status: "pending",
      paymentMethod,
      orderId,
      snapToken,
      createdAt: new Date().toISOString(),
    };

    const db = await readLocalDb();
    db.subscriptions.unshift(record);
    await writeLocalDb(db);

    return NextResponse.json({
      ok: true,
      order: record,
      plan,
      midtransLive: Boolean(snapToken),
      snapToken,
      redirectUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat tagihan." },
      { status: 500 }
    );
  }
}
