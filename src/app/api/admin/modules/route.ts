import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { deleteModule, getModules, upsertModule } from "@/lib/db";
import { ModuleItem } from "@/lib/types";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }
  const modules = await getModules(true);
  return NextResponse.json({ modules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Judul modul wajib diisi." }, { status: 400 });
    }

    const id = body.id ? String(body.id) : `mod-${Date.now()}`;
    const slug = body.slug ? slugify(String(body.slug)) : `${slugify(title)}-${Date.now().toString().slice(-4)}`;
    const totalPages = Math.max(1, Number(body.totalPages || 1));

    const syllabusLines = Array.isArray(body.syllabus)
      ? body.syllabus
      : String(body.syllabusText || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((topic, idx) => ({ day: `Materi ${idx + 1}`, topic }));

    const mod: ModuleItem = {
      id,
      slug,
      title,
      subtitle: String(body.subtitle || "Modul Belajar Bahasa Inggris Kampung Sapen"),
      category: String(body.category || "General English"),
      level: (["Pemula", "Anak-Anak", "Menengah", "Lanjutan"].includes(body.level)
        ? body.level
        : "Pemula") as ModuleItem["level"],
      durationLabel: String(body.durationLabel || `${totalPages} Halaman Flipbook`),
      scheduleLabel: String(body.scheduleLabel || "Jam belajar fleksibel (24 Jam)"),
      targetAudience: String(body.targetAudience || "Warga Kampung Sapen & Peserta Umum"),
      quotaNote: "Gratis dengan Kode Warga Sapen • Tersedia untuk Umum",
      summary: String(body.summary || body.description || title),
      description: String(body.description || body.summary || title),
      coverTheme: (["emerald", "amber", "sky", "rose", "violet"].includes(body.coverTheme)
        ? body.coverTheme
        : "emerald") as ModuleItem["coverTheme"],
      totalPages,
      hasCustomUploadedPages: Boolean(body.hasCustomUploadedPages),
      isPaidOnly: Boolean(body.isPaidOnly || (body.priceIdr && Number(body.priceIdr) > 0)),
      priceIdr: Number(body.priceIdr || 0),
      practiceEnabled: Boolean(body.practiceEnabled),
      practiceQuestions: Array.isArray(body.practiceQuestions) ? body.practiceQuestions : [],
      syllabus:
        syllabusLines.length > 0
          ? syllabusLines
          : [{ day: "Materi 1", topic: "Pengenalan & Kosakata Utama" }],
      learningOutcomes: body.learningOutcomes || [
        {
          title: "Pemahaman Materi Terarah",
          description: "Mempelajari konsep bahasa Inggris secara bertahap lewat modul bergambar.",
        },
        {
          title: "Latihan Interaktif Langsung",
          description: "Menguji pemahaman dengan Quiz, Flashcard, dan Game Kosakata.",
        },
      ],
      benefits: body.benefits || [
        "Flipbook digital jernih & nyaman dibaca lewat HP maupun Laptop",
        "Dilengkapi Quiz & Game Kosakata per modul",
        "Gratis bagi pemegang Kode Akses Warga Sapen",
      ],
      previewHighlights: body.previewHighlights || [
        {
          badge: "Info Modul",
          title: `Ringkasan ${title}`,
          summary: String(body.summary || "Materi praktis disusun oleh Pengurus Kampung Inggris Sapen."),
        },
      ],
      isPublished: body.isPublished !== false,
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const saved = await upsertModule(mod);
    return NextResponse.json({ ok: true, module: saved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan modul." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }
  const moduleId = req.nextUrl.searchParams.get("id");
  if (!moduleId) {
    return NextResponse.json({ error: "ID modul diperlukan." }, { status: 400 });
  }
  await deleteModule(moduleId);
  return NextResponse.json({ ok: true });
}
