import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getPlans, readLocalDb, writeLocalDb } from "@/lib/db";
import { SubscriptionRecord } from "@/lib/types";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userName, userEmail, planId, durationDays = 30 } = body;

    if (!userEmail || !userName) {
      return NextResponse.json(
        { error: "Nama dan email pengguna wajib diisi." },
        { status: 400 }
      );
    }

    const db = await readLocalDb();
    const plans = await getPlans();
    const plan = plans.find((p) => p.id === planId) || plans[0];

    const now = new Date();
    const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const newSub: SubscriptionRecord = {
      id: `sub-manual-${Date.now()}`,
      orderId: `MANUAL-${Date.now().toString(36).toUpperCase()}`,
      userEmail: userEmail.toLowerCase().trim(),
      userName: userName.trim(),
      planId: plan ? plan.id : "bulanan",
      planName: plan ? plan.name : "Paket Belajar Mandiri",
      amountIdr: plan ? plan.priceIdr : 50000,
      paymentMethod: "Manual Grant (Admin)",
      status: "active",
      startsAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      createdAt: now.toISOString(),
    };

    db.subscriptions.unshift(newSub);
    await writeLocalDb(db);

    return NextResponse.json({ ok: true, subscription: newSub });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memberikan akses manual." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, action } = body;

    const db = await readLocalDb();
    const subIdx = db.subscriptions.findIndex((s) => s.id === id);

    if (subIdx < 0) {
      return NextResponse.json({ error: "Data langganan tidak ditemukan." }, { status: 404 });
    }

    const sub = db.subscriptions[subIdx];

    if (action === "toggle") {
      sub.status = sub.status === "active" ? "expired" : "active";
    } else if (action === "extend30") {
      const currentExpiry = sub.expiresAt && new Date(sub.expiresAt).getTime() > Date.now()
        ? new Date(sub.expiresAt)
        : new Date();
      sub.expiresAt = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      sub.status = "active";
    }

    await writeLocalDb(db);
    return NextResponse.json({ ok: true, subscription: sub });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui status langganan." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID wajib disertakan." }, { status: 400 });
    }

    const db = await readLocalDb();
    db.subscriptions = db.subscriptions.filter((s) => s.id !== id);
    await writeLocalDb(db);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus langganan." },
      { status: 500 }
    );
  }
}
