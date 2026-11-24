import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, Info } from "lucide-react";
import { getUserEnrollments } from "@/lib/db";
import { getPublicClasses, getPublicModules, getPublicPracticeCounts } from "@/lib/public-data-cache";
import ClassCatalogClient from "@/components/ClassCatalogClient";
import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/site";
import { getSessionWithGuestContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGuestSessionDestination } from "@/lib/guest-session-destination";

export const metadata: Metadata = publicPageMetadata({
  title: "Kelas Bahasa Inggris untuk Semua Tingkat",
  description: "Temukan kelas, materi, dan latihan Bahasa Inggris di Kampung Inggris Sapen, Demangan, Yogyakarta. Pilih program belajar yang sesuai dan mulai berlatih bersama.",
  pathname: "/kelas",
});

export const revalidate = 60;

async function KelasIndexContent({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; tab?: string }>;
}) {
  const sp = (await searchParams) || {};
  const session = await getSessionWithGuestContext();
  if (session?.guestSessionId) redirect(await getGuestSessionDestination(session));
  const isWarga = session?.origin === "warga_kode";
  const isWargaCodeOnly = isWarga && (!session?.email || session.emailVerified !== true);
  const [classesUnsorted, modules] = await Promise.all([getPublicClasses(), getPublicModules()]);
  const classes = [...classesUnsorted].sort((a, b) => {
    const createdA = Date.parse(a.createdAt || "");
    const createdB = Date.parse(b.createdAt || "");
    return (Number.isFinite(createdB) ? createdB : 0) - (Number.isFinite(createdA) ? createdA : 0);
  });
  const moduleMap = new Map(modules.map((m) => [m.id, m]));
  const [independentGameCounts, enrollments] = await Promise.all([
    getPublicPracticeCounts(classes.map((item) => item.id)),
    session?.email ? getUserEnrollments(session.email) : Promise.resolve([]),
  ]);
  const ownedClassIds = new Set(isWarga ? classes.map((item) => item.id) : enrollments.map((enrollment) => enrollment.classId));
  const canEnroll = Boolean(session?.email && session.emailVerified && session.authUserId && ["peserta", "umum", "member"].includes(session.role));
  const isMyClassesTab = !isWargaCodeOnly && sp.tab === "mine";
  const visibleClasses = isMyClassesTab ? classes.filter((cls) => isWarga || ownedClassIds.has(cls.id)) : classes.filter((cls) => isWarga || !ownedClassIds.has(cls.id));

  return (
    <div className="workbook-page">
      <section className="workbook-wrap pb-14 pt-8 sm:pb-20 sm:pt-8">
        {sp.from === "materi" && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Materi hanya dapat dibuka melalui <strong>Kelas</strong>. Silakan pilih kelas di bawah untuk mengakses Bab &amp; Materi.</p>
          </div>
        )}
        {!isWarga && <div className="mb-8 flex items-start gap-3 rounded-xl border border-rule bg-white/80 px-4 py-3 text-sm text-body">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
          <p>Kelas berbayar di keranjang akan aktif setelah pesanan diselesaikan. Kelas gratis dapat langsung diambil dari halaman detail kelas.</p>
        </div>}
        <div className="mb-8 grid gap-8 border-b border-[#d8d0bf] pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="workbook-print-note">Program belajar · daftar kelas</p>
            <h1 className="mt-3 max-w-3xl text-[clamp(24px,7vw,32px)] leading-tight">Pilih kelas yang pas untukmu.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-body">Setiap kelas memadukan materi bacaan, latihan, dan game edukatif. Buka rincian untuk melihat isi kelas serta pilihan pendaftaran.</p>
          </div>
        </div>

        <nav aria-label="Daftar kelas" className="mb-7 flex w-full rounded-xl border border-rule bg-white p-1 sm:w-fit">
          <Link aria-current={!isMyClassesTab ? "page" : undefined} href="/kelas" className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-bold sm:flex-none ${!isMyClassesTab ? "bg-[#244b3a] text-white" : "text-[#244b3a] hover:bg-[#f5f1e8]"}`}>Semua</Link>
          {!isWargaCodeOnly && <Link aria-current={isMyClassesTab ? "page" : undefined} href="/kelas?tab=mine" className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-bold sm:flex-none ${isMyClassesTab ? "bg-[#244b3a] text-white" : "text-[#244b3a] hover:bg-[#f5f1e8]"}`}>Kelas Saya</Link>}
        </nav>

        <ClassCatalogClient items={visibleClasses.map((cls) => ({
          ...cls,
          chapterCount: cls.modules?.length ? cls.modules.filter((module) => module.status === "terbit").length : cls.moduleIds?.map((id) => moduleMap.get(id)).filter(Boolean).length || 0,
          practiceCount: independentGameCounts[cls.id] || 0,
          enrolled: isWarga || ownedClassIds.has(cls.id),
        }))} isMyClassesTab={isMyClassesTab} isSignedIn={Boolean(session?.email)} canEnroll={canEnroll} />
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
