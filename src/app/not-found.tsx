import Link from "next/link";
import { BookOpen, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="workbook-page flex min-h-[60vh] items-center px-4 py-16">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-leaf-soft text-leaf"><BookOpen className="h-8 w-8" /></div>
        <h1 className="mt-5 text-2xl">Halaman Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-body">Maaf, halaman atau modul yang Anda cari tidak tersedia atau alamatnya sudah berubah.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-earth px-6 py-3 text-sm font-extrabold text-white shadow-card hover:bg-earth-dark">
          <Home className="h-4 w-4" />Kembali ke Beranda Kampung Sapen
        </Link>
      </div>
    </main>
  );
}
