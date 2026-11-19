import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Gamepad2, Info } from "lucide-react";
import { getClasses, getModules } from "@/lib/db";
import AddToCartButton from "@/components/AddToCartButton";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { formatIDR } from "@/lib/currency";
import { getSessionWithGuestContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGuestSessionDestination } from "@/lib/guest-session-destination";

export const metadata: Metadata = {
  title: "Daftar Kelas Bahasa Inggris | Kampung Inggris Sapen",
  description: "Jelajahi kelas Bahasa Inggris, materi, latihan, dan game edukatif di Kampung Inggris Sapen, Demangan, Yogyakarta.",
  alternates: canonicalUrl("/kelas") ? { canonical: canonicalUrl("/kelas") } : undefined,
  openGraph: { title: "Daftar Kelas Bahasa Inggris | Kampung Inggris Sapen", description: "Jelajahi kelas Bahasa Inggris, materi, latihan, dan game edukatif di Kampung Inggris Sapen, Demangan, Yogyakarta." },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function KelasIndexContent({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const sp = (await searchParams) || {};
  const session = await getSessionWithGuestContext();
  if (session?.role === "guest") redirect(await getGuestSessionDestination(session));
  const [classes, modules] = await Promise.all([getClasses(false), getModules(false)]);
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  return (
    <div className="workbook-page">
      <section className="workbook-wrap pb-14 pt-12 sm:pb-20 sm:pt-16">
        {sp.from === "materi" && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Materi hanya dapat dibuka melalui <strong>Kelas</strong>. Silakan pilih kelas di bawah untuk mengakses Bab &amp; Materi.</p>
          </div>
        )}
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-rule bg-white/80 px-4 py-3 text-sm text-body">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
          <p>Pendaftaran melalui pembayaran online belum tersedia sementara. Kelas yang Anda pilih tetap dapat disimpan di keranjang untuk ditinjau.</p>
        </div>
        <div className="mb-12 grid gap-8 border-b-2 border-ink pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="workbook-print-note">Program belajar · daftar kelas</p>
            <h1 className="mt-3 max-w-3xl text-4xl sm:text-6xl">Pilih kelas yang pas untukmu.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-body">Setiap kelas memadukan materi bacaan, latihan, dan game edukatif. Buka rincian untuk melihat isi kelas serta pilihan pendaftaran.</p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6">
          <div className="grid gap-5">
            {classes.length > 0 ? classes.map((cls, index) => {
              const modCount = cls.modules?.filter((module) => module.status === "terbit").length || cls.moduleIds?.length || 0;
              const gameCount = cls.gameTemplateIds?.length || 0;
              const associatedModules = cls.modules?.length
                ? cls.modules.filter((module) => module.status === "terbit").length
                : cls.moduleIds?.map((id) => moduleMap.get(id)).filter(Boolean).length || modCount;
              const moduleLabel = `${associatedModules} modul`;
              return (
                <article key={cls.id} className="grid min-w-0 gap-5 rounded-2xl border border-rule bg-white p-5 shadow-card sm:grid-cols-[minmax(0,1fr)_15rem] sm:gap-6 sm:p-6 lg:items-center">
                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-bold text-earth">LEMBAR {String(index + 1).padStart(2, "0")}</p>
                    <h2 className="break-words text-2xl leading-tight sm:text-3xl">{cls.title}</h2>
                    {cls.subtitle && <p className="mt-1 break-words text-sm font-bold text-leaf">{cls.subtitle}</p>}
                    <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-body">{cls.description}</p>
                  </div>
                  <div className="flex min-w-0 flex-col items-stretch gap-4 border-t border-rule pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                    <div className="grid gap-2 text-sm text-body">
                      <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-leaf" />Akses selamanya</span>
                      <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 shrink-0 text-leaf" />{moduleLabel}</span>
                      <span className="flex items-center gap-2"><Gamepad2 className="h-4 w-4 shrink-0 text-earth" />{gameCount > 0 ? `${gameCount} sesi` : "Game kelas"}</span>
                    </div>
                    <div className="grid gap-3 border-t border-rule pt-4">
                      <div><span className="block text-xs font-semibold text-muted">Investasi belajar</span><strong className="font-display text-2xl">{formatIDR(cls.priceIdr)}</strong></div>
                      <div className="flex min-w-0 flex-col items-stretch gap-3">
                        <Link href={`/kelas/${cls.slug}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-earth px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-earth-dark">Detail kelas <ArrowRight className="h-4 w-4" /></Link>
                        <AddToCartButton classId={cls.id} compact />
                      </div>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-2xl border border-rule bg-paper-light px-6 py-12 text-center shadow-card">
                <BookOpen className="mx-auto h-8 w-8 text-leaf" aria-hidden="true" />
                <h2 className="mt-4 text-xl">Kelas belum tersedia</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Informasi kelas akan ditampilkan di halaman ini setelah tersedia.</p>
                <Link href="/tentang" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-leaf px-4 py-2 text-sm font-bold text-leaf hover:bg-leaf-soft">Tentang program</Link>
              </div>
            )}
          </div>
          <aside className="h-fit rounded-2xl border border-rule bg-white p-6 shadow-card">
            <h2 className="text-xl">Sebelum memilih</h2>
            <p className="mt-3 text-sm leading-6 text-body">Pilih kelas satuan sesuai tujuan belajarmu. Tambahkan satu atau beberapa kelas ke keranjang, lalu daftar sekaligus.</p>
            <div className="mt-6 border-t border-rule pt-4 text-xs leading-5 text-muted"><Clock className="mb-2 h-4 w-4 text-earth" />Akses kelas berlaku selamanya, kecuali akun peserta dihapus.</div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function KelasLoadingState() {
  return (
    <div className="workbook-page" aria-busy="true" aria-label="Memuat daftar kelas">
      <section className="workbook-wrap pb-14 pt-12 sm:pb-20 sm:pt-16">
        <div className="mb-8 h-[58px] rounded-xl border border-rule bg-white/70" />
        <div className="mb-12 border-b-2 border-ink pb-8">
          <p className="workbook-print-note">Program belajar · daftar kelas</p>
          <h1 className="mt-3 max-w-3xl text-4xl sm:text-6xl">Pilih kelas yang pas untukmu.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-body">Setiap kelas memadukan materi bacaan, latihan, dan game edukatif. Buka rincian untuk melihat isi kelas serta pilihan pendaftaran.</p>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <div className="grid gap-6">
            {[0, 1].map((item) => (
                <div key={item} aria-hidden="true" className="min-h-64 rounded-2xl border border-rule bg-white p-5 shadow-card sm:p-6">
                <div className="h-5 w-2/3 rounded bg-paper-light" />
                <div className="mt-4 h-3 w-full rounded bg-paper-light" />
                <div className="mt-2 h-3 w-5/6 rounded bg-paper-light" />
                <div className="mt-8 h-24 rounded bg-paper-light" />
                <div className="mt-4 h-11 rounded-lg bg-paper-light" />
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="h-48 rounded-2xl border border-rule bg-white p-6 shadow-card" />
        </div>
      </section>
    </div>
  );
}

export default function KelasIndexPage(props: {
  searchParams?: Promise<{ from?: string }>;
}) {
  return <Suspense fallback={<KelasLoadingState />}><KelasIndexContent {...props} /></Suspense>;
}
