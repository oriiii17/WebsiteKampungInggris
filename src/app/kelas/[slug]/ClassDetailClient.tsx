"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { ClassItem, ModuleItem, SessionPayload } from "@/lib/types";
import AddToCartButton from "@/components/AddToCartButton";
import { formatIDR } from "@/lib/currency";

interface Props {
  classItem: ClassItem;
  includedModules: ModuleItem[];
  isEnrolled: boolean;
  sessionUser: SessionPayload | null;
}

export default function ClassDetailClient({ classItem, includedModules, isEnrolled, sessionUser }: Props) {
  const isGuest = sessionUser?.role === "guest" || sessionUser?.origin === "guest";
  const publishedModules = classItem.modules?.length
    ? [...classItem.modules].sort((a, b) => a.urutan - b.urutan)
    : includedModules.map((module, index) => ({
        id: module.id,
        kelasId: classItem.id,
        judulBebas: module.title,
        deskripsi: module.subtitle || module.summary,
        urutan: index + 1,
        status: "terbit" as const,
        quiz: null,
      }));

  return (
    <div className="space-y-8">
      {!isGuest && <Link href="/kelas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rule bg-white px-4 py-2 text-sm font-bold text-leaf transition hover:bg-leaf-soft">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog Kelas
      </Link>}

      <section className={`class-detail-hero${isGuest ? " class-detail-hero-guest" : ""}`}>
        <div className="class-detail-copy">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="section-badge"><Sparkles className="h-3.5 w-3.5 text-earth" /> Akses Selamanya</span>
            {isEnrolled && <span className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 text-xs font-bold text-green-900"><ShieldCheck className="h-3.5 w-3.5" /> Akses Anda Aktif</span>}
          </div>
          <h1 className="mt-3 break-words text-4xl sm:text-5xl">{classItem.title}</h1>
          {classItem.subtitle && <p className="mt-2 text-base font-bold text-leaf">{classItem.subtitle}</p>}
          <p className="mt-4 max-w-2xl text-base leading-7 text-body">{classItem.description}</p>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-rule pt-5 text-sm text-body">
            <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-leaf" />{publishedModules.length} materi</span>
          </div>
        </div>
        {!isGuest && <div className="class-detail-enrollment">
          <div>
            <p className="workbook-print-note">Biaya akses kelas</p>
            <p className="mt-1 font-display text-3xl">{formatIDR(classItem.priceIdr)}</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted">Akses ke materi dan game kelas ini setelah pendaftaran tersedia.</p>
          </div>
          {!isEnrolled ? (
            <div className="flex flex-col items-start gap-2">
              <AddToCartButton classId={classItem.id} />
              <p className="max-w-sm text-xs leading-5 text-muted">Pendaftaran online belum tersedia sementara. Pilihan kelas tersimpan di keranjang; belum ada transaksi yang dibuat.</p>
            </div>
          ) : (
            <div className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-900"><CheckCircle2 className="h-5 w-5 text-green-700" /> Anda sudah terdaftar. Selamat belajar!</div>
          )}
        </div>}
      </section>

      <section className="class-detail-section">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-4">
          <div><h2 className="text-2xl sm:text-3xl">Modul pelajaran</h2></div>
          <span className="text-sm font-semibold text-muted">{publishedModules.length} modul</span>
        </div>
        {publishedModules.length === 0 ? (
          <div className="sapen-empty-state text-center"><BookOpen className="mx-auto h-8 w-8 text-leaf" aria-hidden="true" /><h3 className="mt-3 text-xl">Materi sedang disiapkan</h3><p className="mt-2 text-sm leading-6 text-muted">Pengajar akan menambahkan modul pelajaran ke kelas ini.</p></div>
        ) : (
          <ol className="class-module-list">
            {publishedModules.map((module, index) => (
              <li key={module.id} className="class-module-row">
                <span className="class-module-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-lg font-bold">{module.judulBebas}</h3>
                  {module.deskripsi && <p className="mt-1 text-sm leading-6 text-body">{module.deskripsi}</p>}
                  {module.quiz ? <p className="mt-2 text-xs font-bold text-leaf">{module.quiz.status === "terbuka" ? "Kuis tersedia untuk dikerjakan" : "Kuis belum dibuka oleh admin"}</p> : <p className="mt-2 text-xs text-muted">Tidak ada kuis untuk modul ini</p>}
                </div>
                {isEnrolled ? module.status === "terbit" ? (
                  <Link href={`/kelas/${classItem.slug}/modul/${module.id}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-leaf px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-leaf-dark">Buka Modul <ArrowRight className="h-4 w-4" /></Link>
                ) : <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-muted"><Lock className="h-3.5 w-3.5" />Draft</span> : <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-muted"><Lock className="h-3.5 w-3.5" />Masukkan Kode Akses</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

    </div>
  );
}
