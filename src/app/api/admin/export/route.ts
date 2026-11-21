import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import * as XLSX from "xlsx";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const data = await readLocalDb();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all";
  const format = searchParams.get("format") || "excel";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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
      const rows = warga.map((w) => ({
          ID: w.id,
          "Nama Panggilan": w.namaPanggilan,
          RW: w.rw,
          "Dibuat": w.createdAt,
          "Login Terakhir": w.lastLoginAt,
          "Diblokir": w.isBlocked ? "Ya" : "Tidak",
          "Total Main Game": w.totalGamesPlayed || 0,
          "Skor Tertinggi": w.highScore || 0,
        }));
      let loginRows = (data.loginLog || []).map((entry) => ({ ID: entry.id, Nama: entry.namaPanggilan, RW: entry.rw, "Waktu Login": entry.loginAt }));
      try {
        const supabase = createSupabaseAdminClient();
        const { data: events } = await supabase.from("rw_access_login_events").select("id,rw,occurred_at").order("occurred_at", { ascending: false });
        if (events) loginRows = events.map((event) => ({ ID: event.id, Nama: "—", RW: event.rw, "Waktu Login": event.occurred_at }));
      } catch { /* Local login history remains an available fallback. */ }
      exportData = { Warga: rows, "Riwayat Login Kode RW": loginRows };
      filename = "data-warga-kampung-sapen";
      break;
    }

    case "participants": {
      const sessions = data.classSessions || [];
      const sessionById = new Map(sessions.map((item) => [item.id, item]));
      const guests = (data.classSessionGuests || []).map((guest) => {
        const session = sessionById.get(guest.sessionId);
        return { ID: guest.id, "Nama Lengkap": guest.name, WhatsApp: guest.whatsapp || "", "Nama Sesi": session?.title || "", Kode: session?.code || "", Status: guest.status, "Tanggal Daftar": guest.registeredAt };
      });
      const userRows = (data.externalUsers || []).map((user) => {
        const enrollments = (data.enrollments || []).filter((item) => (item.userEmail || "").toLowerCase() === String(user.email || "").toLowerCase());
        return { ID: user.id, Nama: user.name, Email: user.email, "Kelas yang Diakses": enrollments.map((item) => `${(data.classes || []).find((itemClass) => itemClass.id === item.classId)?.title || item.classId} (${Number(item.paidAmountIdr || 0) === 0 ? "Gratis" : "Berbayar"})`).join("; "), "Dibuat": user.createdAt };
      });
      exportData = { "Peserta Guest": guests, "User Reguler": userRows };
      filename = "laporan-peserta";
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

  const startMs = from ? Date.parse(`${from}T00:00:00`) : null;
  const endMs = to ? Date.parse(`${to}T23:59:59.999`) : null;
  if ((from && Number.isNaN(startMs)) || (to && Number.isNaN(endMs))) return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
  if (startMs !== null || endMs !== null) {
    const dateKeys = ["Dibuat", "Login Terakhir", "Waktu Login", "Tanggal Daftar", "Mulai"];
    exportData = Object.fromEntries(Object.entries(exportData).map(([name, rows]) => [name, rows.filter((row) => {
      const rawDate = dateKeys.map((key) => row[key]).find((value) => value);
      const timestamp = rawDate ? Date.parse(String(rawDate)) : NaN;
      return Number.isNaN(timestamp) || (startMs === null || timestamp >= startMs) && (endMs === null || timestamp <= endMs);
    })]));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const finalFilename = `${filename}-${timestamp}`;

  if (format === "pdf") {
    const lines = Object.entries(exportData).flatMap(([sheetName, rows]) => [sheetName, ...rows.map((row) => Object.values(row).map((value) => String(value ?? "").replace(/\s+/g, " ")).join(" | ")), ""]);
    const escapePdf = (value: string) => value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?").replace(/([\\()])/g, "\\$1");
    const pages: string[][] = [];
    for (let index = 0; index < lines.length || index === 0; index += 46) pages.push(lines.slice(index, index + 46));
    const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [" + pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ") + `] /Count ${pages.length} >>`];
    pages.forEach((page, index) => {
      const pageId = 3 + index * 2;
      const contentId = pageId + 1;
      const stream = ["BT", "/F1 9 Tf", "48 790 Td", ...page.flatMap((line, lineIndex) => [`(${escapePdf(line).slice(0, 110)}) Tj`, lineIndex < page.length - 1 ? "0 -16 Td" : ""]), "ET"].join("\n");
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`);
      objects.push(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    });
    const chunks = ["%PDF-1.4\n"];
    const offsets = [0];
    let offset = new TextEncoder().encode(chunks[0]).length;
    objects.forEach((object, index) => { offsets.push(offset); const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`; chunks.push(chunk); offset += new TextEncoder().encode(chunk).length; });
    const xrefOffset = offset;
    chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((entry) => `${String(entry).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    return new NextResponse(new TextEncoder().encode(chunks.join("")), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${finalFilename}.pdf"` } });
  }

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
