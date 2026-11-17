import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const data = await readLocalDb();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all";
  const format = searchParams.get("format") || "excel";

  let exportData: Record<string, any[]> = {};
  let filename = "sapen-english-export";

  switch (type) {
    case "classes": {
      exportData = { "Daftar Kelas": (data.classes || []).map((kelas) => ({
        ID: kelas.id,
        Judul: kelas.title,
        Status: kelas.status || (kelas.isPublished ? "berjalan" : "draft"),
        Publikasi: kelas.isPublished ? "Tayang" : "Draft",
        Harga: kelas.priceIdr,
        Tingkat: kelas.tingkat || "Pemula",
        Materi: (kelas.modules || []).map((mod) => mod.judulBebas).join(" | "),
        "Dibuat": kelas.createdAt,
      })) };
      filename = "daftar-kelas-sapen";
      break;
    }
    case "warga": {
      const warga = data.warga || [];
      const loginLog = data.loginLog || [];
      exportData = {
        Warga: warga.map((w) => ({
          ID: w.id,
          "Nama Panggilan": w.namaPanggilan,
          RW: w.rw,
          "Dibuat": w.createdAt,
          "Login Terakhir": w.lastLoginAt,
          "Diblokir": w.isBlocked ? "Ya" : "Tidak",
          "Total Main Game": w.totalGamesPlayed || 0,
          "Skor Tertinggi": w.highScore || 0,
        })),
        "Log Login": loginLog.map((l) => ({
          ID: l.id,
          "Nama Panggilan": l.namaPanggilan,
          RW: l.rw,
          "Login At": l.loginAt,
          "IP Hint": l.ipHint || "-",
        })),
      };
      filename = "data-warga-kampung-sapen";
      break;
    }

    case "external-users": {
      const users = data.externalUsers || [];
      const subscriptions = data.subscriptions || [];
      const plans = data.plans || [];
      const planMap = new Map(plans.map((p) => [p.id, p.name]));

      exportData = {
        "Peserta Umum": users.map((u) => ({
          ID: u.id,
          Nama: u.name,
          Email: u.email,
          "Dibuat": u.createdAt,
        })),
        "Langganan": subscriptions.map((s) => ({
          ID: s.id,
          "Nama Peserta": s.userName,
          Email: s.userEmail,
          "Paket": planMap.get(s.planId) || s.planName,
          "Jumlah (IDR)": s.amountIdr,
          Status: s.status,
          "Metode Bayar": s.paymentMethod,
          "Order ID": s.orderId,
          "Mulai": s.startsAt || "-",
          "Berakhir": s.expiresAt || "-",
          "Dibuat": s.createdAt,
        })),
      };
      filename = "data-peserta-umum-dan-langganan";
      break;
    }

    case "enrollments": {
      const enrollments = data.enrollments || [];
      const classes = data.classes || [];
      const classMap = new Map(classes.map((c) => [c.id, c.title]));

      exportData = {
        "Pendaftaran Kelas": enrollments.map((e) => ({
          ID: e.id,
          "ID Kelas": e.classId,
          "Nama Kelas": classMap.get(e.classId) || "-",
          "Nama Peserta": e.userName,
          Email: e.userEmail,
          Status: e.status,
          "Jumlah Bayar (IDR)": e.paidAmountIdr,
          "Metode Bayar": e.paymentMethod,
          "Mulai": e.startsAt,
          "Berakhir": e.expiresAt,
          "Dibuat": e.createdAt,
        })),
      };
      filename = "data-pendaftaran-kelas";
      break;
    }

    case "leaderboard": {
      const leaderboard = (data as { leaderboard?: any[] }).leaderboard || [];
      exportData = {
        Leaderboard: leaderboard.map((l) => ({
          ID: l.id,
          "Kunci Peserta": l.participantKey,
          "Nama Peserta": l.participantName,
          "Asal Badge": l.originBadge,
          "Modul ID": l.moduleId,
          "Judul Modul": l.moduleTitle,
          "Tipe Game": l.gameType,
          Skor: l.score,
          "Minggu": l.weekLabel,
          "Dibuat": l.createdAt,
        })),
      };
      filename = "data-leaderboard-kuis";
      break;
    }

    case "access-codes": {
      const codes = data.accessCodes || [];
      exportData = {
        "Kode Akses": codes.map((c) => ({
          ID: c.id,
          Kode: c.code,
          Label: c.label,
          "RT/RW": c.rtRw,
          "Tipe Pemilik": c.holderType,
          "Berakhir": c.expiresAt,
          Aktif: c.isActive ? "Ya" : "Tidak",
          "Dibuat Oleh": c.createdBy,
          "Dibuat": c.createdAt,
        })),
      };
      filename = "data-kode-akses-dan-perangkat";
      break;
    }

    case "all":
    default: {
      const warga = data.warga || [];
      const loginLog = data.loginLog || [];
      const users = data.externalUsers || [];
      const subscriptions = data.subscriptions || [];
      const enrollments = data.enrollments || [];
      const leaderboard = (data as { leaderboard?: any[] }).leaderboard || [];
      const classes = data.classes || [];
      const codes = data.accessCodes || [];
      const plans = data.plans || [];
      const planMap = new Map(plans.map((p) => [p.id, p.name]));
      const classMap = new Map(classes.map((c) => [c.id, c.title]));

      exportData = {
        Warga: warga.map((w) => ({
          ID: w.id,
          "Nama Panggilan": w.namaPanggilan,
          RW: w.rw,
          "Dibuat": w.createdAt,
          "Login Terakhir": w.lastLoginAt,
          "Diblokir": w.isBlocked ? "Ya" : "Tidak",
          "Total Main Game": w.totalGamesPlayed || 0,
          "Skor Tertinggi": w.highScore || 0,
        })),
        "Log Login": loginLog.map((l) => ({
          ID: l.id,
          "Nama Panggilan": l.namaPanggilan,
          RW: l.rw,
          "Login At": l.loginAt,
          "IP Hint": l.ipHint || "-",
        })),
        "Peserta Umum": users.map((u) => ({
          ID: u.id,
          Nama: u.name,
          Email: u.email,
          "Dibuat": u.createdAt,
        })),
        "Langganan": subscriptions.map((s) => ({
          ID: s.id,
          "Nama Peserta": s.userName,
          Email: s.userEmail,
          "Paket": planMap.get(s.planId) || s.planName,
          "Jumlah (IDR)": s.amountIdr,
          Status: s.status,
          "Metode Bayar": s.paymentMethod,
          "Order ID": s.orderId,
          "Mulai": s.startsAt || "-",
          "Berakhir": s.expiresAt || "-",
          "Dibuat": s.createdAt,
        })),
        "Pendaftaran Kelas": enrollments.map((e) => ({
          ID: e.id,
          "ID Kelas": e.classId,
          "Nama Kelas": classMap.get(e.classId) || "-",
          "Nama Peserta": e.userName,
          Email: e.userEmail,
          Status: e.status,
          "Jumlah Bayar (IDR)": e.paidAmountIdr,
          "Metode Bayar": e.paymentMethod,
          "Mulai": e.startsAt,
          "Berakhir": e.expiresAt,
          "Dibuat": e.createdAt,
        })),
        Leaderboard: leaderboard.map((l) => ({
          ID: l.id,
          "Kunci Peserta": l.participantKey,
          "Nama Peserta": l.participantName,
          "Asal Badge": l.originBadge,
          "Modul ID": l.moduleId,
          "Judul Modul": l.moduleTitle,
          "Tipe Game": l.gameType,
          Skor: l.score,
          "Minggu": l.weekLabel,
          "Dibuat": l.createdAt,
        })),
        "Kode Akses": codes.map((c) => ({
          ID: c.id,
          Kode: c.code,
          Label: c.label,
          "RT/RW": c.rtRw,
          "Tipe Pemilik": c.holderType,
          "Berakhir": c.expiresAt,
          Aktif: c.isActive ? "Ya" : "Tidak",
          "Dibuat Oleh": c.createdBy,
          "Dibuat": c.createdAt,
        })),
      };
      filename = "sapen-english-lengkap";
      break;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const finalFilename = `${filename}-${timestamp}`;

  if (format === "csv") {
    const csvParts: string[] = [];
    for (const [sheetName, rows] of Object.entries(exportData)) {
      if (rows.length === 0) continue;
      csvParts.push(`=== ${sheetName} ===`);
      const headers = Object.keys(rows[0]);
      csvParts.push(headers.join(","));
      for (const row of rows) {
        const values = headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvParts.push(values.join(","));
      }
      csvParts.push("");
    }
    const csvContent = csvParts.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${finalFilename}.csv"`,
      },
    });
  }

  if (format !== "excel") return NextResponse.json({ error: "Format ekspor tidak didukung." }, { status: 400 });

  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(exportData)) {
    if (rows.length === 0) continue;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const safeSheetName = sheetName.slice(0, 31).replace(/[\\/*?:[\]]/g, "");
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  }

  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(excelBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${finalFilename}.xlsx"`,
    },
  });
}
