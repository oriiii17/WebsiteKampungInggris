import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Gamepad2 } from "lucide-react";
import ClassAccessAction from "@/components/ClassAccessAction";
import { getSessionWithGuestContext } from "@/lib/auth";
import { getClasses, getModules, getPublishedIndependentGameCounts, getUserEnrollments } from "@/lib/db";
import { getGuestSessionDestination } from "@/lib/guest-session-destination";

export const dynamic = "force-dynamic";

export default async function MyClassesPage() {
  const session = await getSessionWithGuestContext();
  if (session?.guestSessionId) redirect(await getGuestSessionDestination(session));
  const isWarga = session?.origin === "warga_kode";
  const isAdmin = ["admin", "pengurus", "developer"].includes(session?.role || "");
  if (!session?.email && !isWarga && !isAdmin) redirect("/masuk?next=%2Fkelas-saya");

  const [classes, modules] = await Promise.all([getClasses(false), getModules(false)]);
  const moduleIds = new Set(modules.map((item) => item.id));
  const enrollments = session?.email && session.emailVerified ? await getUserEnrollments(session.email) : [];
  const ownedIds = new Set(enrollments.map((item) => item.classId));
  const visible = isWarga || isAdmin ? classes : classes.filter((item) => ownedIds.has(item.id));
  const gameCounts = await getPublishedIndependentGameCounts(visible.map((item) => item.id));

  return <main className="workbook-page min-h-[70dvh] py-8 sm:py-14"><section className="workbook-wrap pb-24">
    <p className="workbook-print-note">Ruang belajar Anda</p><h1 className="mt-3 text-4xl sm:text-5xl">Kelas Saya</h1>
    <p className="mt-3 max-w-2xl text-base leading-7 text-body">Kelas yang sudah Anda ambil atau miliki aksesnya tersedia di sini.</p>
    {!session?.emailVerified && !isWarga && !isAdmin && <div role="status" className="mt-6 rounded-xl border border-[#d7c59e] bg-[#fff8e7] p-4 text-sm leading-6 text-[#57451e]">Verifikasi email Anda untuk melihat dan mengaktifkan akses kelas.</div>}
    <div className="mt-7 grid gap-4">
      {visible.length ? visible.map((item) => <article key={item.id} className="grid min-w-0 gap-4 rounded-2xl border border-rule bg-white p-5 shadow-card sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-center sm:p-6">
        <div className="min-w-0"><h2 className="break-words text-2xl font-bold">{item.title}</h2>{item.subtitle && <p className="mt-1 break-words font-semibold text-leaf">{item.subtitle}</p>}<p className="mt-2 break-words text-sm leading-6 text-body">{item.description}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-body"><span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-leaf" />{item.modules?.length ? item.modules.filter((chapter) => chapter.status === "terbit").length : item.moduleIds?.filter((id) => moduleIds.has(id)).length || 0} Bab</span><span className="inline-flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-earth" />{gameCounts[item.id] || 0} Latihan Mandiri</span></div></div>
        <div className="grid min-w-0 gap-2"><ClassAccessAction classId={item.id} classSlug={item.slug} priceIdr={item.priceIdr} isEnrolled={true} canEnroll={false} /></div>
      </article>) : <div className="rounded-2xl border border-rule bg-paper-light px-6 py-12 text-center"><BookOpen className="mx-auto h-8 w-8 text-leaf" aria-hidden="true" /><h2 className="mt-4 text-xl">Belum ada kelas di Kelas Saya</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Ambil kelas gratis atau pilih kelas dari katalog untuk mulai belajar.</p><Link href="/kelas" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#244b3a] px-4 font-bold text-white">Lihat semua kelas</Link></div>}
    </div>
  </section></main>;
}
