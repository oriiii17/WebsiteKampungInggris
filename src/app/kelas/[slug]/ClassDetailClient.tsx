"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Gamepad2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { ClassItem, ModuleItem, SessionPayload } from "@/lib/types";
import AddToCartButton from "@/components/AddToCartButton";
import { classIllustration, gameIllustration } from "@/lib/illustrations";
import type { GameBlueprint } from "@/lib/game-blueprint";

interface Props {
  classItem: ClassItem;
  includedModules: ModuleItem[];
  isEnrolled: boolean;
  sessionUser: SessionPayload | null;
  blueprintGames: GameBlueprint[];
}

export default function ClassDetailClient({ classItem, includedModules, isEnrolled, sessionUser, blueprintGames }: Props) {
  void sessionUser;
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
    <div className="space-y-10">
      <Link href="/kelas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rule bg-white px-4 py-2 text-sm font-bold text-leaf transition hover:bg-leaf-soft">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog Kelas
      </Link>

      <section className="class-detail-hero">
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
            <span className="inline-flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-earth" />{blueprintGames.length + (classItem.gameTemplateIds?.length || 0)} game kelas</span>
          </div>
        </div>
        <figure className="class-detail-art illustration-frame">
          <Image src={classIllustration(classItem.title)} alt={`Ilustrasi kegiatan belajar untuk ${classItem.title}`} fill sizes="(max-width: 899px) 100vw, 40vw" className="object-cover" />
          <figcaption className="absolute bottom-3 left-3"><span className="workbook-photo-note">Materi dan latihan dalam satu kelas</span></figcaption>
        </figure>
        <div className="class-detail-enrollment">
          <div>
            <p className="workbook-print-note">Biaya akses kelas</p>
            <p className="mt-1 font-display text-3xl">Rp {classItem.priceIdr.toLocaleString("id-ID")}</p>
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
        </div>
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

      {classItem.gameTemplateIds && classItem.gameTemplateIds.length > 0 && (
        <section className="class-detail-section">
          <div className="mb-5 border-b border-rule pb-4"><p className="workbook-print-note">Latihan aktif</p><h2 className="mt-2 text-2xl sm:text-3xl">Game &amp; kuis kelas</h2></div>
          <div className="class-game-grid">
            {classItem.gameTemplateIds.map((gameId) => (
              <article key={gameId} className="class-game-item">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-paper"><Image src={gameIllustration(gameId)} alt={`Ilustrasi permainan ${gameId.replace(/-/g, " ")}`} fill sizes="(max-width: 639px) 100vw, 50vw" className="object-cover" /></div>
                <div className="mt-3 flex items-start justify-between gap-3"><div><h3 className="text-base font-bold capitalize">{gameId.replace(/-/g, " ")}</h3><p className="mt-1 text-xs text-muted">Sesi live interaktif</p></div><span className="section-badge shrink-0">Tersedia</span></div>
              </article>
            ))}
          </div>
        </section>
      )}
      {blueprintGames.length > 0 && <section className="class-detail-section"><div className="mb-5 border-b border-rule pb-4"><p className="workbook-print-note">Game terpasang</p><h2 className="mt-2 text-2xl sm:text-3xl">Game untuk kelas ini</h2></div><ul className="divide-y divide-rule">{blueprintGames.map((game) => <li key={game.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{game.title}</h3><p className="mt-1 text-sm text-muted">{game.level} · {game.topic} · {game.items.length} soal</p></div>{isEnrolled ? <Link href={`/games/${encodeURIComponent(game.id)}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-leaf px-4 text-sm font-bold text-white">Mainkan <ArrowRight className="h-4 w-4" /></Link> : <span className="text-sm text-muted">Masukkan kode akses untuk bermain</span>}</li>)}</ul></section>}
    </div>
  );
}
