import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Clock, Gamepad2 } from "lucide-react";
import { getClasses, getModules } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function KelasIndexPage() {
  const [classes, modules] = await Promise.all([getClasses(false), getModules(false)]);
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  return (
    <div className="workbook-page min-h-screen">
      <section className="workbook-wrap pb-14 pt-12 sm:pb-20 sm:pt-16">
        <div className="mb-12 grid gap-8 border-b-2 border-ink pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="workbook-print-note">Program belajar · daftar kelas</p>
            <h1 className="mt-3 max-w-3xl text-4xl sm:text-6xl">Pilih kelas yang pas untukmu.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-body">Setiap kelas memadukan materi bacaan, latihan, dan game edukatif. Buka rincian untuk melihat isi kelas serta pilihan pendaftaran.</p>
          </div>
          <Link href="/materi" className="inline-flex min-h-11 items-center gap-2 font-extrabold text-leaf underline decoration-sunshine decoration-2 underline-offset-4 hover:text-earth">Jelajahi semua materi <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-[minmax(0,1fr)_15rem]">
          <div>
            <div className="hidden grid-cols-[1fr_7rem_8rem_12rem] gap-4 border-b border-rule py-3 text-xs font-extrabold uppercase tracking-wider text-muted md:grid">
              <span>Nama kelas</span><span>Durasi</span><span>Isi belajar</span><span>Biaya & pendaftaran</span>
            </div>
            {classes.length > 0 ? classes.map((cls, index) => {
              const modCount = cls.moduleIds?.length || 0;
              const gameCount = cls.gameTemplateIds?.length || 0;
              const associatedModules = cls.moduleIds?.map((id) => moduleMap.get(id)).filter(Boolean).length || modCount;
              const moduleLabel = associatedModules > 0 ? `${associatedModules} modul` : "Materi terstruktur";
              return (
                <article key={cls.id} className="grid gap-5 border-b border-rule py-7 md:grid-cols-[minmax(0,1fr)_7rem_8rem_12rem] md:items-center md:gap-4">
                  <div>
                    <p className="mb-2 text-xs font-bold text-earth">LEMBAR {String(index + 1).padStart(2, "0")}</p>
                    <h2 className="text-2xl sm:text-3xl">{cls.title}</h2>
                    {cls.subtitle && <p className="mt-1 text-sm font-bold text-leaf">{cls.subtitle}</p>}
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-body">{cls.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-body md:block">
                    <Calendar className="h-4 w-4 text-leaf md:mb-2" /><span>{cls.durationDays} hari akses</span>
                  </div>
                  <div className="flex gap-5 text-sm text-body md:block">
                    <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-leaf" />{moduleLabel}</span>
                    <span className="mt-2 flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-earth" />{gameCount > 0 ? `${gameCount} sesi` : "Game kelas"}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4 md:block md:border-0 md:pt-0">
                    <div><span className="block text-xs font-semibold text-muted">Investasi belajar</span><strong className="font-display text-2xl">Rp {cls.priceIdr.toLocaleString("id-ID")}</strong></div>
                    <Link href={`/kelas/${cls.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-earth px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-earth-dark md:mt-3">Lihat kelas <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                </article>
              );
            }) : <p className="border-b border-rule py-8 text-sm text-muted">Kelas belum tersedia.</p>}
          </div>
          <aside className="mt-10 h-fit border-t-2 border-leaf bg-paper-light p-5 md:mt-0">
            <h2 className="text-xl">Sebelum memilih</h2>
            <p className="mt-3 text-sm leading-6 text-body">Warga dengan kode akses dapat belajar tanpa biaya. Peserta umum dapat melihat paket dan mendaftar melalui akun.</p>
            <Link href="/paket" className="mt-5 inline-flex min-h-11 items-center gap-2 font-extrabold text-leaf underline decoration-sunshine underline-offset-4">Lihat paket <ArrowRight className="h-4 w-4" /></Link>
            <div className="mt-6 border-t border-rule pt-4 text-xs leading-5 text-muted"><Clock className="mb-2 h-4 w-4 text-earth" />Durasi akses dan cakupan materi tercantum pada setiap kelas.</div>
          </aside>
        </div>
      </section>
    </div>
  );
}
