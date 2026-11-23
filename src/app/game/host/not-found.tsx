import Link from "next/link";
import { ArrowLeft, Presentation } from "lucide-react";

export default function HostNotFound() {
  return <main className="grid min-h-dvh place-items-center bg-[#f3e9d5] px-4 py-12 text-[#183b2d]"><section className="w-full max-w-lg rounded-2xl border border-[#d2c5ad] bg-white p-7 text-center shadow-sm sm:p-10"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8eee5]"><Presentation aria-hidden="true" /></span><h1 className="mt-5 font-display text-3xl font-bold">Halaman host tidak ditemukan</h1><p className="mt-3 text-sm leading-6 text-[#514b3e]">Kuis host tidak tersedia atau sesi kuis telah berakhir.</p><Link href="/admin" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-5 font-bold text-white hover:bg-[#183b2d]"><ArrowLeft className="h-4 w-4" />Kembali ke panel admin</Link></section></main>;
}
