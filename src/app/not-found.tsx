import React from "react";
import Link from "next/link";
import { BookOpen, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sapen-100 text-sapen-700">
        <BookOpen className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Maaf, halaman atau modul yang Anda cari tidak tersedia atau alamatnya sudah berubah.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-sapen-600 px-6 py-3 text-sm font-extrabold text-white shadow hover:bg-sapen-700"
      >
        <Home className="h-4 w-4" />
        Kembali ke Beranda Kampung Sapen
      </Link>
    </div>
  );
}
