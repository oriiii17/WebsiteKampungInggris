"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, List, Lock } from "lucide-react";
import { ClassItem, ClassModule } from "@/lib/types";
import FlipbookViewer from "@/components/FlipbookViewer";
import MaterialImageViewer from "@/components/MaterialImageViewer";
import OfficeDocumentPreview from "@/components/OfficeDocumentPreview";

export default function ModuleViewClient({
  cls,
  mod,
  initialEnrolled,
  isAdmin,
}: {
  cls: ClassItem;
  mod: ClassModule;
  initialEnrolled: boolean;
  isAdmin: boolean;
}) {
  const sorted = useMemo(() => [...(cls.modules || [])].sort((a, b) => a.urutan - b.urutan), [cls.modules]);
  const idx = sorted.findIndex((m) => m.id === mod.id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

  const hasFile = Boolean(mod.filePDF || mod.fileAsli);
  const pdfPath = mod.filePDF || (mod.fileType === "pdf" ? mod.fileAsli : "");
  const viewCode = "";
  const pdfUrl = pdfPath ? `/api/secure-class-file/${encodeURIComponent(cls.id)}/${encodeURIComponent(mod.id)}?kind=pdf${viewCode}` : "";
  const originalUrl = mod.fileAsli ? `/api/secure-class-file/${encodeURIComponent(cls.id)}/${encodeURIComponent(mod.id)}?kind=original${viewCode}` : "";
  const downloadUrl = mod.fileAsli
    ? `/api/secure-class-file/${encodeURIComponent(cls.id)}/${encodeURIComponent(mod.id)}?kind=original&download=1${viewCode}`
    : (pdfPath ? `/api/secure-class-file/${encodeURIComponent(cls.id)}/${encodeURIComponent(mod.id)}?kind=pdf&download=1${viewCode}` : "");

  return (
    <div className="space-y-5 text-[#1A2E1A]">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1A2E1A]/70">
        <Link href="/kelas" className="hover:text-[#14532D] hover:underline">Kelas</Link>
        <ChevronRight className="h-4 w-4 text-[#1A2E1A]/40" />
        <Link href={`/kelas/${cls.slug}`} className="hover:text-[#14532D] hover:underline max-w-[200px] sm:max-w-xs truncate" title={cls.title}>{cls.title}</Link>
        <ChevronRight className="h-4 w-4 text-[#1A2E1A]/40" />
        <span className="text-[#14532D] font-extrabold truncate max-w-[240px] sm:max-w-md" title={mod.judulBebas}>{mod.judulBebas}</span>
      </nav>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#14532D]">{cls.title} &rsaquo; Bab &amp; Materi</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-[#1A2E1A]">{mod.judulBebas}</h1>
        {mod.deskripsi && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#1A2E1A]/75">{mod.deskripsi}</p>}
      </div>

      {!initialEnrolled && !isAdmin ? (
        <div className="max-w-xl rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#14532D]/10 text-[#14532D]"><Lock className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-extrabold">Materi Terkunci</h2>
              <p className="mt-1 text-sm text-[#1A2E1A]/75">Daftar atau masuk ke akun peserta untuk membuka materi kelas.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Link href={`/kelas/${cls.slug}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[#14532D] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0F3F22]">Lihat kelas & daftar</Link><Link href="/masuk" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-extrabold hover:bg-[#FDFBF7]">Masuk</Link></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[270px_minmax(0,1fr)] items-start">
          <aside className="rounded-xl border border-[#E5E7EB] bg-white p-3 sm:p-4 lg:sticky lg:top-24 order-2 lg:order-1">
            <div className="flex items-center gap-2 mb-3 px-1">
              <List className="h-4 w-4 text-[#14532D]" />
              <h2 className="text-sm font-extrabold text-[#1A2E1A]">Daftar Bab</h2>
            </div>
            <ol className="space-y-1.5 max-h-[55vh] lg:max-h-[70vh] overflow-auto pr-1">
              {sorted.map((m, i) => {
                const active = m.id === mod.id;
                return (
                  <li key={m.id}>
                    <Link href={`/kelas/${cls.slug}/modul/${m.id}`} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${active ? "border-[#14532D] bg-[#14532D] text-white" : "border-transparent hover:border-[#E5E7EB] hover:bg-[#FDFBF7] text-[#1A2E1A]"}`} aria-current={active ? "page" : undefined}>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-extrabold ${active ? "bg-white/15 text-white" : "bg-[#FDFBF7] border border-[#E5E7EB] text-[#14532D]"}`}>{i + 1}</span>
                      <span className="min-w-0">
                        <span className={`block font-bold leading-snug ${active ? "text-white" : ""}`}>{m.judulBebas}</span>
                        {m.status === "draft" && <span className={`mt-0.5 block text-[10px] font-semibold ${active ? "text-white/80" : "text-amber-700"}`}>Draft</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {sorted.length === 0 && <li className="text-xs text-[#1A2E1A]/60 px-1">Belum ada bab/materi.</li>}
            </ol>
          </aside>

          <div className="space-y-4 min-w-0 order-1 lg:order-2">
            {hasFile ? (
              mod.fileType === "image" && originalUrl ? (
                <MaterialImageViewer key={mod.id} src={originalUrl} downloadUrl={downloadUrl} fileName={mod.fileAsliName || "Materi gambar"} />
              ) : pdfUrl ? (
                <FlipbookViewer
                  key={mod.id}
                  moduleTitle={mod.judulBebas}
                  pdfUrl={pdfUrl}
                  downloadUrl={downloadUrl || undefined}
                  downloadLabel={mod.fileAsliName ? `Unduh (${mod.fileAsliName})` : "Unduh file asli"}
                  watermarkText={cls.title}
                />
              ) : mod.fileType === "ppt" || mod.fileType === "pptx" ? (
                <OfficeDocumentPreview
                  key={mod.id}
                  signedUrlEndpoint={`/api/secure-class-file/${encodeURIComponent(cls.id)}/${encodeURIComponent(mod.id)}?kind=office-url`}
                  downloadUrl={downloadUrl}
                  fileName={mod.fileAsliName || "Materi presentasi"}
                />
              ) : <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-center text-sm">Pratinjau untuk file ini belum tersedia. <a href={downloadUrl} className="font-bold text-[#14532D] underline">Unduh file</a>.</div>
            ) : (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-[#14532D]" />
                <p className="mt-3 text-sm font-bold text-[#1A2E1A]">Materi belum memiliki file flipbook.</p>
                <p className="mt-1 text-xs text-[#1A2E1A]/70">Pengajar dapat mengunggah PDF/PPTX untuk flipbook. Ringkasan materi tampil di bawah bila tersedia.</p>
                {mod.deskripsi && <div className="mt-4 rounded-lg bg-[#FDFBF7] border border-[#E5E7EB] p-4 text-left text-sm text-[#1A2E1A]/80 whitespace-pre-wrap">{mod.deskripsi}</div>}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] pt-4">
              {prev ? (
                <Link href={`/kelas/${cls.slug}/modul/${prev.id}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold hover:bg-[#FDFBF7]"><ArrowLeft className="h-4 w-4" /> Bab Sebelumnya</Link>
              ) : <span className="text-xs text-[#1A2E1A]/50">Awal kelas</span>}
              <span className="text-xs font-semibold text-[#1A2E1A]/60">Bab {idx + 1} dari {sorted.length}</span>
              {next ? (
                <Link href={`/kelas/${cls.slug}/modul/${next.id}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#14532D] bg-[#14532D] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#0F3F22]">Bab Berikutnya <ArrowRight className="h-4 w-4" /></Link>
              ) : <span className="text-xs font-bold text-[#14532D]">Bab terakhir</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
