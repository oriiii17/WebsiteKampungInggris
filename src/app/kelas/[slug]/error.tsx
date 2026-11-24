"use client";

export default function ClassDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="workbook-page min-h-dvh px-4 py-12 sm:px-6">
    <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-[#d8d0bf] bg-white p-6 text-center shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-bold text-[#183b2d]">Detail kelas belum dapat dimuat</h1>
      <p className="mt-3 text-sm leading-6 text-[#4a5568]">Koneksi sedang lambat atau terjadi kendala sementara. Silakan coba lagi.</p>
      <button type="button" onClick={() => reset()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#244b3a] px-5 text-sm font-bold text-white hover:bg-[#183b2d] sm:w-auto">Coba lagi</button>
    </section>
  </main>;
}
