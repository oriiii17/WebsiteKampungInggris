import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  encodeSessionToken,
  getServerSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";
import { getPlans, readLocalDb, writeLocalDb } from "@/lib/db";
import { isMidtransConfigured } from "@/lib/supabase";
import { SessionPayload } from "@/lib/types";

/**
 * Menangani aktivasi otomatis baik dari Webhook Midtrans maupun Simulator Pembayaran Lokal
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mode 1: Webhook notifikasi resmi Midtrans
    const orderId = String(body.order_id || body.orderId || "");
    if (!orderId) {
      return NextResponse.json({ error: "Order ID kosong." }, { status: 400 });
    }

    if (body.signature_key && isMidtransConfigured()) {
      const rawSig = `${body.order_id}${body.status_code}${body.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`;
      const expected = crypto.createHash("sha512").update(rawSig).digest("hex");
      if (expected !== body.signature_key) {
        return NextResponse.json({ error: "Signature Midtrans tidak valid." }, { status: 403 });
      }
    }

    const transactionStatus = body.transaction_status || "settlement";
    const isPaid = ["capture", "settlement", "paid_simulation"].includes(transactionStatus);

    const db = await readLocalDb();
    const subIdx = db.subscriptions.findIndex((s) => s.orderId === orderId);
    if (subIdx < 0) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    }

    const sub = db.subscriptions[subIdx];
    const plans = await getPlans();
    const plan = plans.find((p) => p.id === sub.planId);
    const durationDays = plan?.durationDays || 30;

    if (isPaid) {
      const now = new Date();
      const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      sub.status = "active";
      sub.startsAt = now.toISOString();
      sub.expiresAt = expires.toISOString();
      if (body.paymentMethod) {
        sub.paymentMethod = String(body.paymentMethod);
      }
    } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
      sub.status = "failed";
    }

    await writeLocalDb(db);

    const res = NextResponse.json({ ok: true, subscription: sub });

    // Perbarui cookie sesi peserta jika ia sedang login di browser yang sama
    const currentSession = await getServerSession();
    if (
      currentSession &&
      currentSession.email?.toLowerCase() === sub.userEmail.toLowerCase() &&
      sub.status === "active"
    ) {
      const updatedSession: SessionPayload = {
        ...currentSession,
        origin: "luar_langganan",
        expiresAt: sub.expiresAt,
      };
      res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(updatedSession), sessionCookieOptions(updatedSession, req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:"));
    }

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran." },
      { status: 500 }
    );
  }
}
