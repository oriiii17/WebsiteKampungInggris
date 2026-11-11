import { NextRequest, NextResponse } from "next/server";
import {
  encodeSessionToken,
  getServerSession,
  hashPassword,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import {
  enrollUserInClass,
  getClassByIdOrSlug,
  readLocalDb,
  writeLocalDb,
} from "@/lib/db";
import { ExternalUser, SessionPayload } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, paymentMethod } = body;

    if (!classId) {
      return NextResponse.json({ error: "Kelas wajib dipilih." }, { status: 400 });
    }

    const classItem = await getClassByIdOrSlug(classId);
    if (!classItem) {
      return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
    }

    let session = await getServerSession();
    let userEmail = session?.email || "";
    let userName = session?.name || "";

    // Jika pengguna belum login, lakukan self-registration
    if (!session) {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const password = String(body.password || "").trim();

      if (!email || !name) {
        return NextResponse.json(
          { error: "Nama dan email wajib diisi untuk pendaftaran kelas." },
          { status: 400 }
        );
      }

      const db = await readLocalDb();
      if (!db.externalUsers) db.externalUsers = [];

      let user = db.externalUsers.find((u) => u.email.toLowerCase() === email);
      if (!user) {
        const passwordHash = password ? hashPassword(password) : hashPassword("123456");
        user = {
          id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          email,
          passwordHash,
          createdAt: new Date().toISOString(),
        };
        db.externalUsers.push(user);
        await writeLocalDb(db);
      }

      userEmail = user.email;
      userName = user.name;

      session = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "peserta",
        origin: "luar_langganan",
        watermarkText: `${user.name} · ${user.email}`,
      };
    }

    // Buat enrollment aktif secara mandiri
    const enrollment = await enrollUserInClass({
      classId: classItem.id,
      userEmail,
      userName,
      paidAmountIdr: classItem.priceIdr,
      paymentMethod: paymentMethod || "QRIS Instan",
    });

    const res = NextResponse.json({
      ok: true,
      enrollment,
      message: `Pendaftaran berhasil! Akses kelas "${classItem.title}" aktif selama ${classItem.durationDays} hari.`,
    });

    // Perbarui session cookie jika baru login/daftar
    if (session) {
      res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 60,
      });
    }

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memproses pendaftaran kelas." },
      { status: 500 }
    );
  }
}
